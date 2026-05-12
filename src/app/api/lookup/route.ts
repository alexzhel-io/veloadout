import { NextRequest, NextResponse } from 'next/server';
import { SQLiteGearItemRepository } from '@/infrastructure/persistence/SQLiteGearItemRepository';
import { ClaudeGearSearchService } from '@/infrastructure/ai/ClaudeGearSearchService';
import { LookupOrSearchGearItemUseCase } from '@/application/gear/LookupOrSearchGearItemUseCase';

export const runtime = 'nodejs';

const repository = new SQLiteGearItemRepository();
const searchService = new ClaudeGearSearchService();
const useCase = new LookupOrSearchGearItemUseCase(repository, searchService);

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: 'Query too short' }, { status: 400 });
  }

  const result = await useCase.execute(query.trim());

  if (result.status === 'not_found') {
    return NextResponse.json({ status: 'not_found' });
  }

  const item = result.item;
  return NextResponse.json({
    status: result.status,
    item: {
      id: item.id,
      names: item.names,
      volumeLiters: item.volumeLiters,
      weightGrams: item.weightGrams,
      category: item.category,
      sourceUrl: item.sourceUrl,
    },
    ...(result.status === 'found_ai' ? { confidence: result.confidence } : {}),
  });
}
