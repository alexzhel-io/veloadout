import { GearItem } from '@/domain/gear/GearItem';
import { GearCategory } from '@/domain/gear/GearCategory';
import { IGearItemRepository } from '@/domain/gear/IGearItemRepository';
import { getDatabase } from './database';

interface GearItemRow {
  id: string;
  names_json: string;
  aliases_json: string;
  volume_liters: number;
  weight_grams: number | null;
  category: string;
  source_url: string | null;
  verified_at: string | null;
  created_at: string;
}

function rowToGearItem(row: GearItemRow): GearItem {
  return GearItem.create({
    id: row.id,
    names: JSON.parse(row.names_json) as Record<string, string>,
    aliases: JSON.parse(row.aliases_json) as string[],
    volumeLiters: row.volume_liters,
    weightGrams: row.weight_grams ?? undefined,
    category: row.category as GearCategory,
    sourceUrl: row.source_url ?? undefined,
    verifiedAt: row.verified_at ? new Date(row.verified_at) : undefined,
    createdAt: new Date(row.created_at),
  });
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9Ѐ-ӿ]/g, ' ').replace(/\s+/g, ' ').trim();
}

export class SQLiteGearItemRepository implements IGearItemRepository {
  private get db() { return getDatabase(); }

  async findByQuery(query: string): Promise<GearItem | null> {
    const norm = normalize(query);

    // 1. Exact alias match
    const rows = this.db.prepare('SELECT * FROM gear_items').all() as GearItemRow[];

    for (const row of rows) {
      const aliases: string[] = JSON.parse(row.aliases_json);
      const names: Record<string, string> = JSON.parse(row.names_json);

      const candidates = [
        ...aliases,
        ...Object.values(names),
      ].map(normalize);

      if (candidates.some(c => c === norm)) return rowToGearItem(row);
    }

    // 2. Substring match in aliases / names
    for (const row of rows) {
      const aliases: string[] = JSON.parse(row.aliases_json);
      const names: Record<string, string> = JSON.parse(row.names_json);

      const candidates = [...aliases, ...Object.values(names)].map(normalize);
      if (candidates.some(c => c.includes(norm) || norm.includes(c))) {
        return rowToGearItem(row);
      }
    }

    return null;
  }

  async findById(id: string): Promise<GearItem | null> {
    const row = this.db.prepare('SELECT * FROM gear_items WHERE id = ?').get(id) as GearItemRow | undefined;
    return row ? rowToGearItem(row) : null;
  }

  async save(item: GearItem): Promise<void> {
    const props = item.toPlain();
    this.db.prepare(`
      INSERT INTO gear_items (id, names_json, aliases_json, volume_liters, weight_grams, category, source_url, verified_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        names_json = excluded.names_json,
        aliases_json = excluded.aliases_json,
        volume_liters = excluded.volume_liters,
        weight_grams = excluded.weight_grams,
        category = excluded.category,
        source_url = excluded.source_url,
        verified_at = excluded.verified_at
    `).run(
      props.id,
      JSON.stringify(props.names),
      JSON.stringify(props.aliases),
      props.volumeLiters,
      props.weightGrams ?? null,
      props.category,
      props.sourceUrl ?? null,
      props.verifiedAt?.toISOString() ?? null,
      props.createdAt.toISOString(),
    );
  }

  async listAll(): Promise<GearItem[]> {
    const rows = this.db.prepare('SELECT * FROM gear_items ORDER BY created_at DESC').all() as GearItemRow[];
    return rows.map(rowToGearItem);
  }
}
