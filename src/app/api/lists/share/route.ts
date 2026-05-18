import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { generateShareSlug } from '@/infrastructure/share/slug';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bagSetupSchema = z.object({
  capacities: z.record(z.number().min(0).max(50)),
  active:     z.record(z.boolean()),
  mode:       z.enum(['cumulative', 'each']),
}).strict();

const postSchema = z.object({
  listId:   z.string().uuid(),
  bagSetup: bagSetupSchema,
});

/**
 * Create or refresh a public share link for the user's gear list. Captures
 * the current bag setup as a snapshot so the public view shows the same
 * distribution the sharer sees. Returns the slug; the client builds the URL.
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = postSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  // Ensure the list belongs to the caller before we attach a share slug.
  const { data: list, error: selectError } = await supabase
    .from('gear_lists')
    .select('id, share_slug')
    .eq('id', body.data.listId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (selectError) return NextResponse.json({ error: selectError.message }, { status: 500 });
  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });

  // Reuse existing slug if there is one, otherwise generate fresh.
  const slug = list.share_slug ?? generateShareSlug();

  const { error: updateError } = await supabase
    .from('gear_lists')
    .update({
      share_slug: slug,
      shared_at: new Date().toISOString(),
      shared_bag_setup_json: body.data.bagSetup,
    })
    .eq('id', body.data.listId);

  if (updateError) {
    console.error('[share POST] update failed:', updateError.message);
    return NextResponse.json({ error: 'Failed to share list' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, slug });
}

/** Revoke a share link. The shared URL stops working immediately. */
export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const listId = req.nextUrl.searchParams.get('listId');
  if (!listId) return NextResponse.json({ error: 'listId required' }, { status: 400 });

  const { error } = await supabase
    .from('gear_lists')
    .update({ share_slug: null, shared_at: null, shared_bag_setup_json: null })
    .eq('id', listId)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
