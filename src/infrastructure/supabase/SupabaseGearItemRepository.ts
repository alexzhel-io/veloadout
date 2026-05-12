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

    // search_text is a generated column: lower(names_json::text || aliases_json::text)
    // GIN trigram index makes this fast even at thousands of items
    const { data, error } = await this.supabase
      .from('gear_items')
      .select('id,names_json,aliases_json,volume_liters,weight_grams,category,source_url,verified_at,created_at,variants_json')
      .ilike('search_text', `%${norm}%`)
      .limit(20);

    if (error) {
      console.error('[gear_items findByQuery]', error.message);
      return null;
    }
    if (!data || data.length === 0) return null;

    // Re-rank locally: exact match > substring
    const rows = data as GearItemRow[];
    let exactMatch: GearItemRow | null = null;
    let substringMatch: GearItemRow | null = null;

    for (const row of rows) {
      const candidates = [
        ...Object.values(row.names_json ?? {}),
        ...(row.aliases_json ?? []),
      ].map(normalize);

      if (candidates.some(c => c === norm)) { exactMatch = row; break; }
      if (!substringMatch && candidates.some(c => c.includes(norm) || norm.includes(c))) {
        substringMatch = row;
      }
    }

    const match = exactMatch ?? substringMatch ?? rows[0];
    return rowToGearItem(match);
  }

  async findById(id: string): Promise<GearItem | null> {
    const { data, error } = await this.supabase
      .from('gear_items')
      .select('id,names_json,aliases_json,volume_liters,weight_grams,category,source_url,verified_at,created_at,variants_json')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error('[gear_items findById]', error.message);
      return null;
    }
    return data ? rowToGearItem(data as GearItemRow) : null;
  }

  async save(item: GearItem): Promise<void> {
    const props = item.toPlain();
    const { error } = await this.supabase.from('gear_items').upsert({
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
    if (error) throw new Error(`Supabase save failed: ${error.message} (code: ${error.code})`);
  }

  async listAll(): Promise<GearItem[]> {
    const { data, error } = await this.supabase
      .from('gear_items')
      .select('id,names_json,aliases_json,volume_liters,weight_grams,category,source_url,verified_at,created_at,variants_json')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[gear_items listAll]', error.message);
      return [];
    }
    return ((data ?? []) as GearItemRow[]).map(rowToGearItem);
  }
}
