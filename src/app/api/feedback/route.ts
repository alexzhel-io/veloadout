import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { checkRateLimit } from '@/infrastructure/security/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  itemId:         z.string().min(1).max(100),
  itemName:       z.string().min(1).max(200),
  field:          z.enum(['volume', 'weight', 'name', 'url', 'variants', 'other']),
  comment:        z.string().max(1000).optional(),
  suggestedValue: z.number().min(0).max(100000).optional(),
});

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';
}

/**
 * Crowd-sourced feedback on catalog item accuracy. Open to anon users so
 * the friction to flag bad data is zero — anti-abuse comes from a tight
 * per-IP rate limit (10 / IP / 10 min) backed by Upstash.
 *
 * Authenticated users get their submission linked to their account so
 * they can see their own submissions later via RLS.
 */
export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid body', details: body.error.flatten() }, { status: 400 });
  }

  const limit = await checkRateLimit(`feedback:ip:${clientIp(req)}`, 10, 600);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many feedback submissions. Try again later.' }, { status: 429 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from('gear_item_feedback').insert({
    item_id:         body.data.itemId,
    item_name:       body.data.itemName,
    user_id:         user?.id ?? null,
    field:           body.data.field,
    comment:         body.data.comment ?? null,
    suggested_value: body.data.suggestedValue ?? null,
  });

  if (error) {
    console.error('[feedback POST] insert failed:', error.message);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
