import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { SupabaseGearItemRepository } from '@/infrastructure/supabase/SupabaseGearItemRepository';
import { ClaudeGearSearchService } from '@/infrastructure/ai/ClaudeGearSearchService';
import { LookupOrSearchGearItemUseCase } from '@/application/gear/LookupOrSearchGearItemUseCase';
import { GearItem } from '@/domain/gear/GearItem';
import { GearCategory } from '@/domain/gear/GearCategory';
import { checkRateLimit, checkDailyBudget } from '@/infrastructure/security/rateLimit';
import { looksLikeGarbage } from '@/infrastructure/security/queryHeuristics';
import { looksLikeBikepackingBag } from '@/infrastructure/security/bagBlocklist';
import { isCachedMiss, recordMiss } from '@/infrastructure/supabase/aiSearchMissCache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const querySchema = z.string().trim().min(2).max(200);

const variantSchema = z.object({
  sizeLabel: z.string(),
  volumeLiters: z.number(),
  weightGrams: z.number().optional(),
});

const saveItemSchema = z.object({
  // id is ignored — server derives a deterministic slug from the English name
  id: z.string().optional(),
  // English-only naming for catalog items. Translations belong to UI (categories,
  // presets), not to product brand names which should be left verbatim.
  names: z.object({
    en: z.string().min(1).max(200),
  }).passthrough().transform(v => ({ en: v.en })),
  volumeLiters: z.number().min(0).max(500),
  weightGrams: z.number().min(0).max(100000).optional(),
  category: z.nativeEnum(GearCategory),
  sourceUrl: z.string().url().max(2000).optional(),
  variants: z.array(variantSchema).max(20).default([]),
  aliases: z.array(z.string().max(200)).max(30).default([]),
});

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const postSchema = z.object({
  item: saveItemSchema,
});

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

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';
}

async function buildRepo() {
  const supabase = await createServerSupabaseClient();
  return new SupabaseGearItemRepository(supabase);
}

export async function GET(req: NextRequest) {
  const rawQuery = req.nextUrl.searchParams.get('q');
  const parsed = querySchema.safeParse(rawQuery);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid query' }, { status: 400 });

  const dbOnly = req.nextUrl.searchParams.get('db_only') === '1';
  const query = parsed.data;
  const repo = await buildRepo();

  if (dbOnly) {
    const items = await repo.findManyByQuery(query, 8);
    if (items.length === 0) return NextResponse.json({ status: 'not_found' });
    if (items.length === 1) return NextResponse.json({ status: 'found_db', item: itemPayload(items[0]) });
    return NextResponse.json({ status: 'found_many', items: items.map(itemPayload) });
  }

  // ------------------------------------------------------------------
  // AI search path — guarded by 5 defence layers to prevent abuse:
  // 1. Auth gate: anonymous users can't burn Anthropic quota
  // 2. Heuristic filter: obvious garbage queries rejected before AI
  // 3. Per-user rate limit: 20 AI searches / user / hour
  // 4. Miss cache: same query that recently returned not_found short-circuits
  // 5. Global daily budget cap: hard ceiling on AI spend per project
  // ------------------------------------------------------------------

  // Layer 1: auth gate
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to use AI search', status: 'auth_required' }, { status: 401 });
  }

  // Layer 2: heuristic filter
  if (looksLikeGarbage(query)) {
    return NextResponse.json({ status: 'not_found' });
  }

  // Bags are deliberately not in the catalog — the app recommends bags
  // based on gear volume; including bags would be circular.
  if (looksLikeBikepackingBag(query)) {
    return NextResponse.json({ status: 'bag_excluded' });
  }

  // Layer 3: per-user rate limit (replaces per-IP — auth makes this stable)
  const limit = await checkRateLimit(`lookup:user:${user.id}`, 20, 3600);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again later.', resetIn: limit.resetIn }, { status: 429 });
  }

  // Layer 4: miss cache
  if (await isCachedMiss(supabase, query)) {
    return NextResponse.json({ status: 'not_found' });
  }

  // Layer 5: daily budget cap (project-wide)
  const budget = await checkDailyBudget('ai_lookup', 500);
  if (!budget.allowed) {
    console.warn('[lookup] daily AI budget exhausted at', budget.used, 'calls');
    return NextResponse.json({ error: 'AI search temporarily unavailable. Please try again tomorrow.' }, { status: 503 });
  }

  const depthRaw = parseInt(req.nextUrl.searchParams.get('depth') ?? '1', 10);
  const depth = Math.max(1, Math.min(3, Number.isFinite(depthRaw) ? depthRaw : 1));

  const useCase = new LookupOrSearchGearItemUseCase(repo, new ClaudeGearSearchService());
  const result = await useCase.execute(query, false, depth); // don't auto-save — wait for user confirm

  if (result.status === 'not_found') {
    // Cache the miss so subsequent identical queries skip AI for 24h
    await recordMiss(supabase, query);
    return NextResponse.json({ status: 'not_found' });
  }

  // Defence in depth: AI sometimes returns bags despite the prompt asking
  // for gear only. Reject here so they never reach the user or the DB.
  if (result.status === 'found_ai' && looksLikeBikepackingBag(result.item.names.en)) {
    await recordMiss(supabase, query);
    return NextResponse.json({ status: 'bag_excluded' });
  }

  return NextResponse.json({
    status: result.status,
    item: itemPayload(result.item),
    ...(result.status === 'found_ai' ? {
      confidence: result.confidence,
      volumeNote: result.volumeNote,
    } : {}),
  });
}

// Called when user confirms an AI-found item — saves it to the shared catalog.
// Requires authentication: only signed-in users can contribute to the public catalog.
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = postSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Invalid body', details: body.error.flatten() }, { status: 400 });

  const limit = await checkRateLimit(`lookup:${clientIp(req)}`, 20, 3600);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { item: d } = body.data;

  // Bikepacking bags are deliberately excluded from the shared catalog.
  if (looksLikeBikepackingBag(d.names.en)) {
    return NextResponse.json({ error: 'Bikepacking bags are not part of the gear catalog' }, { status: 400 });
  }

  // Server-derived id from the English name. This both prevents clients from
  // hijacking arbitrary catalog rows and keeps dig-deeper updates in place.
  const serverId = slugifyName(d.names.en);
  if (!serverId) return NextResponse.json({ error: 'Invalid name' }, { status: 400 });

  const gearItem = GearItem.create({
    id: serverId,
    names: d.names,
    aliases: d.aliases,
    volumeLiters: d.volumeLiters,
    weightGrams: d.weightGrams,
    category: d.category,
    sourceUrl: d.sourceUrl,
    variants: d.variants,
    createdAt: new Date(),
  });

  try {
    const repo = new SupabaseGearItemRepository(supabase);
    await repo.save(gearItem);
  } catch (err) {
    console.error('[lookup POST] save failed:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: serverId });
}
