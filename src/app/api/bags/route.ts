import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import type { BagProduct } from '@/domain/gear/BagProduct';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Returns all bag products (~25-30 rows, trivial payload).
 * Public — RLS allows anyone to SELECT bag_products.
 *
 * Client filters/sorts on the front-end so the picker can re-use
 * the same fetched list across slots without re-querying.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('bag_products')
    .select('id, brand, model, slot, paired, capacity_per_bag_l, weight_grams, image_url, amazon_asin, source_url, price_eur')
    .order('slot', { ascending: true })
    .order('capacity_per_bag_l', { ascending: true });

  if (error) {
    console.error('[bags GET] failed:', error.message);
    return NextResponse.json({ error: 'Failed to load bags' }, { status: 500 });
  }

  const bags: BagProduct[] = (data ?? []).map(row => ({
    id:              row.id,
    brand:           row.brand,
    model:           row.model,
    slot:            row.slot,
    paired:          row.paired,
    capacityPerBagL: Number(row.capacity_per_bag_l),
    weightGrams:     row.weight_grams ?? undefined,
    imageUrl:        row.image_url ?? undefined,
    amazonAsin:      row.amazon_asin ?? undefined,
    sourceUrl:       row.source_url ?? undefined,
    priceEur:        row.price_eur != null ? Number(row.price_eur) : undefined,
  }));

  return NextResponse.json({ bags });
}
