#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

const catalog = JSON.parse(
  readFileSync(join(process.cwd(), 'docs/gear_catalog.json'), 'utf-8')
);

console.log(`Importing ${catalog.length} items...`);

const rows = catalog.map((item: any) => ({
  id: item.id,
  names_json: item.names,
  aliases_json: item.aliases ?? [],
  volume_liters: item.volume_liters,
  weight_grams: item.weight_grams ?? null,
  category: item.category,
  source_url: item.source_url ?? null,
  variants_json: item.variants ?? [],
}));

const BATCH = 50;
let inserted = 0, updated = 0, errors = 0;

async function run() {
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from('gear_items')
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: false })
      .select('id');

    if (error) {
      console.error(`Batch ${i / BATCH + 1} error:`, error.message);
      errors += batch.length;
    } else {
      inserted += data?.length ?? 0;
      console.log(`Batch ${i / BATCH + 1}/${Math.ceil(rows.length / BATCH)} — ${data?.length} rows upserted`);
    }
  }
  console.log(`\nDone. Upserted: ${inserted}, Errors: ${errors}`);
}

run();
