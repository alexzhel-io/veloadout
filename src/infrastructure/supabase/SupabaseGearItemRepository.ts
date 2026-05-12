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

// Module-level cache: load all items once, refresh every 5 minutes
let cachedRows: GearItemRow[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

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

  private async getAllRows(): Promise<GearItemRow[]> {
    if (cachedRows && Date.now() < cacheExpiry) return cachedRows;
    const { data } = await this.supabase.from('gear_items').select('*');
    cachedRows = (data ?? []) as GearItemRow[];
    cacheExpiry = Date.now() + CACHE_TTL_MS;
    return cachedRows;
  }

  async findByQuery(query: string): Promise<GearItem | null> {
    const norm = normalize(query);
    if (!norm) return null;

    const rows = await this.getAllRows();

    let exactMatch: GearItemRow | null = null;
    let substringMatch: GearItemRow | null = null;

    for (const row of rows) {
      const aliases = row.aliases_json ?? [];
      const names = row.names_json ?? {};
      const candidates = [...aliases, ...Object.values(names)].map(normalize);

      if (candidates.some(c => c === norm)) { exactMatch = row; break; }
      if (!substringMatch && candidates.some(c => c.includes(norm) || norm.includes(c))) {
        substringMatch = row;
      }
    }

    const match = exactMatch ?? substringMatch;
    return match ? rowToGearItem(match) : null;
  }

  async findById(id: string): Promise<GearItem | null> {
    const rows = await this.getAllRows();
    const row = rows.find(r => r.id === id);
    return row ? rowToGearItem(row) : null;
  }

  async save(item: GearItem): Promise<void> {
    const props = item.toPlain();
    const row = {
      id: props.id,
      names_json: props.names,
      aliases_json: props.aliases,
      volume_liters: props.volumeLiters,
      weight_grams: props.weightGrams ?? null,
      category: props.category,
      source_url: props.sourceUrl ?? null,
      verified_at: props.verifiedAt?.toISOString() ?? null,
      variants_json: props.variants ?? [],
    };
    await this.supabase.from('gear_items').upsert(row);
    // Update local cache immediately
    if (cachedRows) {
      const idx = cachedRows.findIndex(r => r.id === props.id);
      const newRow: GearItemRow = { ...row, created_at: new Date().toISOString() };
      if (idx >= 0) cachedRows[idx] = newRow;
      else cachedRows.push(newRow);
    }
  }

  async listAll(): Promise<GearItem[]> {
    const rows = await this.getAllRows();
    return rows.map(rowToGearItem);
  }
}
