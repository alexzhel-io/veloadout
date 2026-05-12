import { GearItem } from '@/domain/gear/GearItem';
import { IGearItemRepository } from '@/domain/gear/IGearItemRepository';
import { IGearSearchService } from '@/domain/gear/IGearSearchService';

export type LookupResult =
  | { status: 'found_db'; item: GearItem }
  | { status: 'found_ai'; item: GearItem; confidence: string; sourceUrl?: string }
  | { status: 'not_found' };

export class LookupOrSearchGearItemUseCase {
  constructor(
    private readonly repository: IGearItemRepository,
    private readonly searchService: IGearSearchService,
  ) {}

  async execute(query: string): Promise<LookupResult> {
    const normalized = query.trim().toLowerCase();

    const fromDb = await this.repository.findByQuery(normalized);
    if (fromDb) return { status: 'found_db', item: fromDb };

    const searchResult = await this.searchService.search(query);
    if (!searchResult) return { status: 'not_found' };

    await this.repository.save(searchResult.item);

    return {
      status: 'found_ai',
      item: searchResult.item,
      confidence: searchResult.confidence,
      sourceUrl: searchResult.sourceUrl,
    };
  }
}
