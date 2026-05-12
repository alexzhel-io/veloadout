import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { SupabaseGearItemRepository } from '@/infrastructure/supabase/SupabaseGearItemRepository';
import { ClaudeGearSearchService } from '@/infrastructure/ai/ClaudeGearSearchService';
import { LookupOrSearchGearItemUseCase } from '@/application/gear/LookupOrSearchGearItemUseCase';
import { GearItem } from '@/domain/gear/GearItem';
import { checkRateLimit } from '@/infrastructure/security/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = z.string().trim().min(2).max(200);

function itemPayload(item: GearItem) {
  return {
    id: item.id,
    names: item.names,
    volumeLiters: item.volumeLiters,
    weightGrams: item.weightGrams,
    category: item.category,
    sourceUrl: item.sourceUrl,
    variants: item.variants,
  };
}

async function build() {
  const supabase = await createServerSupabaseClient();
  const repo = new SupabaseGearItemRepository(supabase);
  return { repo, useCase: new LookupOrSearchGearItemUseCase(repo, new ClaudeGearSearchService()) };
}

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';
}

export async function GET(req: NextRequest) {
  const rawQuery = req.nextUrl.searchParams.get('q');
  const parsed = querySchema.safeParse(rawQuery);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid query' }, { status: 400 });

  const dbOnly = req.nextUrl.searchParams.get('db_only') === '1';
  const confirm = req.nextUrl.searchParams.get('confirm') === '1';
  const query = parsed.data;

  const { repo, useCase } = await build();

  if (dbOnly) {
    const item = await repo.findByQuery(query);
    if (!item) return NextResponse.json({ status: 'not_found' });
    return NextResponse.json({ status: 'found_db', item: itemPayload(item) });
  }

  // Rate-limit AI calls (expensive)
  const limit = await checkRateLimit(`lookup:${clientIp(req)}`, 20, 3600);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
  }

  const result = await useCase.execute(query, confirm);
  if (result.status === 'not_found') return NextResponse.json({ status: 'not_found' });

  return NextResponse.json({
    status: result.status,
    item: itemPayload(result.item),
    ...(result.status === 'found_ai' ? {
      confidence: result.confidence,
      volumeNote: result.volumeNote,
    } : {}),
  });
}

const postSchema = z.object({ query: z.string().trim().min(2).max(200) });

export async function POST(req: NextRequest) {
  const body = postSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const limit = await checkRateLimit(`lookup:${clientIp(req)}`, 20, 3600);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { useCase } = await build();
  await useCase.execute(body.data.query, true);
  return NextResponse.json({ ok: true });
}
