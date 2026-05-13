import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { SupabaseGearListRepository } from '@/infrastructure/supabase/SupabaseGearListRepository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const itemSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(50),
  volumeLiters: z.number().min(0).max(500),
  weightGrams: z.number().min(0).max(100000).optional(),
  quantity: z.number().int().min(1).max(99),
  sizeLabel: z.string().max(100).optional(),
  source: z.enum(['db', 'ai', 'preset', 'manual']),
  sourceUrl: z.string().url().max(2000).optional(),
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

// GDPR: full account + data deletion
export async function DELETE() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Cascades will remove gear_lists + gear_list_items via FK
  await supabase.auth.signOut();
  // Note: actual user deletion requires service_role key on the server.
  // For now we sign out + clear lists; full auth.users delete needs admin client.
  await supabase.from('gear_lists').delete().eq('user_id', user.id);
  return NextResponse.json({ ok: true });
}
