import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Redis } from '@upstash/redis';
import { buildAffiliateUrl } from '@/infrastructure/affiliate/affiliateUrl';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// `to` must be a real http(s) URL, capped at 2000 chars (Supabase column limit too)
const schema = z.object({
  to: z.string().url().max(2000),
  item: z.string().max(100).optional(),
  q:   z.string().max(200).optional(), // product name for Amazon search
});

let _redis: Redis | null = null;
function redis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

/**
 * Outbound link redirect for product sources.
 *
 * Why we have this at all (when sourceUrl could just go directly to the
 * manufacturer):
 * 1. Click tracking — we count without third-party analytics.
 * 2. Affiliate readiness — when we sign a partner program, only
 *    `buildAffiliateUrl()` changes; every product link in the catalog
 *    already routes through here.
 * 3. Safety — we reject non-http(s) URLs at the boundary, defending
 *    against legacy DB rows or AI hallucinations that contain
 *    `javascript:` etc.
 */
export async function GET(req: NextRequest) {
  const parsed = schema.safeParse({
    to: req.nextUrl.searchParams.get('to'),
    item: req.nextUrl.searchParams.get('item') ?? undefined,
    q:   req.nextUrl.searchParams.get('q') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid redirect target' }, { status: 400 });
  }

  // Defence in depth — already enforced by z.string().url(), but be explicit.
  let target: URL;
  try {
    target = new URL(parsed.data.to);
  } catch {
    return NextResponse.json({ error: 'Malformed URL' }, { status: 400 });
  }
  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return NextResponse.json({ error: 'Unsupported protocol' }, { status: 400 });
  }

  // Fire-and-forget click counter. Non-blocking on Redis failure.
  const r = redis();
  if (r) {
    const day = new Date().toISOString().slice(0, 10);
    const item = parsed.data.item ?? 'unknown';
    Promise.all([
      r.incr(`clicks:total:${day}`),
      r.incr(`clicks:item:${item}:${day}`),
    ]).catch(err => console.warn('[r/redirect] click count failed:', err));
  }

  const finalUrl = buildAffiliateUrl(target.toString(), parsed.data.q);
  return NextResponse.redirect(finalUrl, 302);
}
