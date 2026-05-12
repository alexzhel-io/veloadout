// Simple in-memory rate limiter. Good enough for single-instance Vercel functions
// and the current scale. Swap for Upstash/Vercel KV when scaling horizontally.

interface Bucket { count: number; resetAt: number }
const buckets = new Map<string, Bucket>();

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowSeconds };
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetIn: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count++;
  return { allowed: true, remaining: maxRequests - existing.count, resetIn: Math.ceil((existing.resetAt - now) / 1000) };
}

// Periodic cleanup of expired entries
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
  }, 60_000).unref?.();
}
