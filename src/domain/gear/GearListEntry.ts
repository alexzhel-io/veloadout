import { GearItem } from './GearItem';

export type SearchStatus = 'found_db' | 'found_ai' | 'not_found' | 'searching';

export interface GearListEntry {
  id: string;
  query: string;
  quantity: number;
  item: GearItem | null;
  status: SearchStatus;
}

export function entryVolume(entry: GearListEntry): number {
  return (entry.item?.volumeLiters ?? 0) * entry.quantity;
}

export function totalVolume(entries: GearListEntry[]): number {
  return entries.reduce((sum, e) => sum + entryVolume(e), 0);
}
