import type { SupabaseClient } from '@supabase/supabase-js';
import { GearItem } from '@/domain/gear/GearItem';
import { GearCategory } from '@/domain/gear/GearCategory';
import { IGearItemRepository } from '@/domain/gear/IGearItemRepository';
import type { GearVariant } from '@/domain/gear/GearVariant';

interface GearItemRow {
  id: string;
  names_json: Record<string, string>;
  aliases_json: string[];
  volume_liters: number;
  weight_grams: number | null;
  category: string;
  source_url: string | null;
  verified_at: string | null;
  created_at: string;
  variants_json: GearVariant[];
}

function rowToGearItem(row: GearItemRow): GearItem {
  return GearItem.create({
    id: row.id,
    names: row.names_json,
    aliases: row.aliases_json ?? [],
    volumeLiters: Number(row.volume_liters),
    weightGrams: row.weight_grams != null ? Number(row.weight_grams) : undefined,
    category: row.category as GearCategory,
    sourceUrl: row.source_url ?? undefined,
    verifiedAt: row.verified_at ? new Date(row.verified_at) : undefined,
    createdAt: new Date(row.created_at),
    variants: row.variants_json ?? [],
  });
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9Ѐ-ӿ]/g, ' ').replace(/\s+/g, ' ').trim();
}

export class SupabaseGearItemRepository implements IGearItemRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findByQuery(query: string): Promise<GearItem | null> {
    const norm = normalize(query);
    if (!norm) return null;

    // Use trigram search via Postgres for substring matching on names/aliases
    const { data, error } = await this.supabase
      .from('gear_items')
      .select('*')
      .or(`names_json.ilike.%${norm}%,aliases_json.ilike.%${norm}%`)
      .limit(50);

    if (error || !data) return null;

    // Re-rank locally: exact alias > exact name > substring
    let exactMatch: GearItemRow | null = null;
    let substringMatch: GearItemRow | null = null;

    for (const row of data as GearItemRow[]) {
      const aliases = row.aliases_json ?? [];
      const names = row.names_json ?? {};
      const candidates = [...aliases, ...Object.values(names)].map(normalize);

      if (candidates.some(c => c === norm)) {
        exactMatch = row;
        break;
      }
      if (!substringMatch && candidates.some(c => c.includes(norm) || norm.includes(c))) {
        substringMatch = row;
      }
    }

    const match = exactMatch ?? substringMatch;
    return match ? rowToGearItem(match) : null;
  }

  async findById(id: string): Promise<GearItem | null> {
    const { data } = await this.supabase.from('gear_items').select('*').eq('id', id).maybeSingle();
    return data ? rowToGearItem(data as GearItemRow) : null;
  }

  async save(item: GearItem): Promise<void> {
    const props = item.toPlain();
    await this.supabase.from('gear_items').upsert({
      id: props.id,
      names_json: props.names,
      aliases_json: props.aliases,
      volume_liters: props.volumeLiters,
      weight_grams: props.weightGrams ?? null,
      category: props.category,
      source_url: props.sourceUrl ?? null,
      verified_at: props.verifiedAt?.toISOString() ?? null,
      variants_json: props.variants ?? [],
    });
  }

  async listAll(): Promise<GearItem[]> {
    const { data } = await this.supabase.from('gear_items').select('*').order('created_at', { ascending: false });
    return ((data ?? []) as GearItemRow[]).map(rowToGearItem);
  }
}
