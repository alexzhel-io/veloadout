import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { SupabaseGearListRepository } from '@/infrastructure/supabase/SupabaseGearListRepository';
import { GearCategory } from '@/domain/gear/GearCategory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const itemSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.nativeEnum(GearCategory),
  volumeLiters: z.number().min(0).max(500),
  weightGrams: z.number().min(0).max(100000).optional(),
  quantity: z.number().int().min(1).max(99),
  sizeLabel: z.string().max(100).optional(),
  source: z.enum(['db', 'ai', 'preset', 'manual']),
  sourceUrl: z.string().url().max(2000).optional(),
  active: z.boolean().optional().default(true),
});

const saveSchema = z.object({
  listId: z.string().uuid(),
  items: z.array(itemSchema).max(500),
  version: z.number().int().optional(),
});

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const repo = new SupabaseGearListRepository(supabase);
  try {
    const list = await repo.getOrCreateList(user.id);
    return NextResponse.json({ list });
  } catch (err) {
    console.error('[lists GET] load failed:', err);
    return NextResponse.json({ error: 'Failed to load list' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = saveSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Invalid body', details: body.error.flatten() }, { status: 400 });

  const repo = new SupabaseGearListRepository(supabase);
  try {
    await repo.saveItems(body.data.listId, body.data.items);
  } catch (err) {
    console.error('[lists POST] save failed:', err);
    return NextResponse.json({ error: 'Failed to save list' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Self-service partial erasure: clears the user's gear lists and signs them
// out. Does NOT delete the auth.users row — that requires the service-role
// key, which we deliberately keep off this deployment. For full GDPR-Art.17
// erasure (account row + all data), users must email the contact address in
// the privacy policy; the operator deletes via Supabase dashboard.
export async function DELETE() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error: delError } = await supabase.from('gear_lists').delete().eq('user_id', user.id);
  if (delError) {
    console.error('[lists DELETE] failed:', delError.message);
    return NextResponse.json({ error: 'Failed to clear lists' }, { status: 500 });
  }
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
