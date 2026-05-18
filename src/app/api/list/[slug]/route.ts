import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { isValidShareSlug } from '@/infrastructure/share/slug';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Read a publicly shared gear list by its slug. No authentication required;
 * RLS policy `Anyone can read shared lists` enforces visibility — the row
 * has to have share_slug set or the query returns nothing.
 *
 * Never returns user identifying info (user_id, email). The frontend just
 * gets items, bag setup, and timestamps.
 */
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isValidShareSlug(slug)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('gear_lists')
    .select('id, name, shared_at, shared_bag_setup_json, gear_list_items(*)')
    .eq('share_slug', slug)
    .maybeSingle();

  if (error) {
    console.error('[list/[slug] GET] failed:', error.message);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    name: data.name,
    sharedAt: data.shared_at,
    bagSetup: data.shared_bag_setup_json,
    items: ((data.gear_list_items as Array<Record<string, unknown>>) ?? []).map(i => ({
      id:           i.id as string,
      name:         i.name as string,
      category:     i.category as string,
      volumeLiters: Number(i.volume_liters),
      weightGrams:  i.weight_grams ? Number(i.weight_grams) : undefined,
      quantity:     Number(i.quantity),
      sizeLabel:    i.size_label as string | undefined,
      sourceUrl:    i.source_url as string | undefined,
      active:       i.active !== false,
    })),
  });
}
