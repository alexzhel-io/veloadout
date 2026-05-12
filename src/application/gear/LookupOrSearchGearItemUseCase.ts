import { GearItem } from '@/domain/gear/GearItem';
import { IGearItemRepository } from '@/domain/gear/IGearItemRepository';
import { IGearSearchService } from '@/domain/gear/IGearSearchService';

export type LookupResult =
  | { status: 'found_db'; item: GearItem }
  | { status: 'found_ai'; item: GearItem; confidence: string; sourceUrl?: string; volumeNote?: string }
  | { status: 'not_found' };

export class LookupOrSearchGearItemUseCase {
  constructor(
    private readonly repository: IGearItemRepository,
    private readonly searchService: IGearSearchService,
  ) {}

  async execute(query: string, saveOnFind = false, depth = 1): Promise<LookupResult> {
    const normalized = query.trim().toLowerCase();

    // Only check DB on first attempt — deeper searches skip cache and go straight to AI
    if (depth <= 1) {
      const fromDb = await this.repository.findByQuery(normalized);
      if (fromDb) return { status: 'found_db', item: fromDb };
    }

    const searchResult = await this.searchService.search(query, depth);
    if (!searchResult) return { status: 'not_found' };

    // Only save to DB if explicitly confirmed (saveOnFind = true)
    if (saveOnFind) {
      await this.repository.save(searchResult.item);
    }

    return {
      status: 'found_ai',
      item: searchResult.item,
      confidence: searchResult.confidence,
      sourceUrl: searchResult.sourceUrl,
      volumeNote: searchResult.volumeNote,
    };
  }
}
