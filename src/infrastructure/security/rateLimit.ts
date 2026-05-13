import 'server-only';
import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;
function redis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

// Fallback in-memory bucket — used when Upstash isn't configured (local dev,
// preview deploys without secrets) or when the Redis call fails. Not safe
// across serverless instances, but never worse than no limit at all.
interface Bucket { count: number; resetAt: number }
const fallbackBuckets = new Map<string, Bucket>();
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of fallbackBuckets) if (v.resetAt < now) fallbackBuckets.delete(k);
  }, 60_000).unref?.();
}

function checkInMemory(key: string, maxRequests: number, windowSeconds: number) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const existing = fallbackBuckets.get(key);
  if (!existing || existing.resetAt < now) {
    fallbackBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowSeconds };
  }
  if (existing.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetIn: Math.ceil((existing.resetAt - now) / 1000) };
  }
  existing.count++;
  return { allowed: true, remaining: maxRequests - existing.count, resetIn: Math.ceil((existing.resetAt - now) / 1000) };
}

/**
 * Distributed rate limit via Upstash Redis. Falls back to per-instance
 * in-memory counters if Redis isn't configured or unreachable.
 *
 * Algorithm: INCR a key, set TTL on first increment. After `maxRequests`
 * within the window, return allowed=false until the key expires.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const r = redis();
  if (!r) return checkInMemory(key, maxRequests, windowSeconds);

  try {
    const prefixed = `rl:${key}`;
    const count = await r.incr(prefixed);
    if (count === 1) {
      await r.expire(prefixed, windowSeconds);
    }
    if (count > maxRequests) {
      const ttl = await r.ttl(prefixed);
      return { allowed: false, remaining: 0, resetIn: Math.max(ttl, 0) };
    }
    return { allowed: true, remaining: maxRequests - count, resetIn: windowSeconds };
  } catch (err) {
    console.warn('[rateLimit] Upstash failed, falling back to in-memory:', err);
    return checkInMemory(key, maxRequests, windowSeconds);
  }
}

/**
 * Daily budget counter — a single global key incremented on every AI call.
 * Returns false (over budget) once `dailyMax` is hit. Resets at the next
 * UTC midnight via a key keyed on YYYY-MM-DD.
 */
export async function checkDailyBudget(
  bucketName: string,
  dailyMax: number,
): Promise<{ allowed: boolean; used: number }> {
  const r = redis();
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const key = `budget:${bucketName}:${day}`;

  if (!r) {
    // No Redis = no real budget enforcement. Fall back to in-memory daily counter.
    const cached = checkInMemory(key, dailyMax, 86400);
    return { allowed: cached.allowed, used: dailyMax - cached.remaining };
  }

  try {
    const used = await r.incr(key);
    if (used === 1) await r.expire(key, 86400 + 3600); // +1h safety margin
    return { allowed: used <= dailyMax, used };
  } catch (err) {
    console.warn('[checkDailyBudget] Upstash failed:', err);
    // On failure, allow the request — fail-open for legitimate users beats
    // false negatives during a Redis outage.
    return { allowed: true, used: 0 };
  }
}
