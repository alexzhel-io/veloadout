import { GearItem } from './GearItem';

export interface GearSearchResult {
  item: GearItem;
  confidence: 'high' | 'medium' | 'low';
  sourceUrl?: string;
  volumeNote?: string;
}

export interface IGearSearchService {
  search(query: string, depth?: number): Promise<GearSearchResult | null>;
}
