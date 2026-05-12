import { GearItem } from './GearItem';

export interface IGearItemRepository {
  findByQuery(query: string): Promise<GearItem | null>;
  findManyByQuery(query: string, limit?: number): Promise<GearItem[]>;
  findById(id: string): Promise<GearItem | null>;
  save(item: GearItem): Promise<void>;
  listAll(): Promise<GearItem[]>;
}
