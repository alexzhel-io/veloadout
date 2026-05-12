import { GearItem } from './GearItem';

export interface IGearItemRepository {
  findByQuery(query: string): Promise<GearItem | null>;
  findById(id: string): Promise<GearItem | null>;
  save(item: GearItem): Promise<void>;
  listAll(): Promise<GearItem[]>;
}
