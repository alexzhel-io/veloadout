import { GearItem } from './GearItem';

export interface GearSearchResult {
  item: GearItem;
  confidence: 'high' | 'medium' | 'low';
  sourceUrl?: string;
}

export interface IGearSearchService {
  search(query: string): Promise<GearSearchResult | null>;
}
