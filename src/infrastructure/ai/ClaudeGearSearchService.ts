import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { GearItem } from '@/domain/gear/GearItem';
import { GearCategory } from '@/domain/gear/GearCategory';
import { IGearSearchService, GearSearchResult } from '@/domain/gear/IGearSearchService';

function systemPrompt(depth: number): string {
  const depthGuidance = depth >= 2 ? `

THOROUGHNESS LEVEL: ${depth}/3 — the user has asked for a DEEPER search because the previous result was incomplete.
- Run MULTIPLE web searches with different queries: "<product> all sizes", "<product> specifications", "<product> review sizes", "<product> short regular long wide"
- Cross-check the official manufacturer page AND at least one retailer (REI, Backcountry, Bergfreunde) to enumerate every size
- If your previous answer missed sizes (Short, Long, Wide, Long Wide, XL, etc.) — find them now
- Aim for COMPLETE coverage of the product line, not just the most common size${depth >= 3 ? `
- This is the FINAL retry — go through 5+ sources, include every regional variant (US/EU sizing), gender variants (Men's/Women's) if they differ in volume/weight` : ''}` : '';

  return `You are a gear database assistant for bikepacking and cycling.
Your task: find the PACKED/COMPRESSED volume in liters AND all available size variants for the item.

Use web search to find exact product specs. Search for "<product name> packed size" or "<product name> stuff sack dimensions" or "<product name> sizes".${depthGuidance}

CRITICAL VOLUME RULES — read carefully:
- volumeLiters = the physical space the item takes up when packed/compressed for transport
- For sleeping bags: stuff sack volume, NOT loft volume. A 3-season bag typically packs to 4–8L
- For tents: packed volume including poles and stuff sack. A 1P tent ≈ 3–5L, a 2P ≈ 5–9L
- For down jackets: stuffed into their pocket ≈ 1–3L
- For inflatable pads: rolled/folded ≈ 2–4L
- For bikepacking bags (seat packs, frame bags, handlebar bags): use their RATED CAPACITY (what fits inside)
- Sanity check your answer: if a tent packs to >15L or a sleeping bag to >15L, you are WRONG

REALISTIC RANGES (packed volume):
- Sleeping bag 3-season: 4–9L | Ultralight: 2–5L
- Tent 1P: 3–5L | Tent 2P: 5–9L | Bivy: 1–2L
- Down jacket: 1–3L | Rain jacket: 0.5–2L
- Inflatable pad: 2–4L | Foam pad: 3–5L
- Bikepacking seat pack: 8–16L | Frame bag: 3–12L | Handlebar: 5–15L

VARIANT RULES — this is the most common source of incomplete results:
- A product line almost ALWAYS has multiple sizes. Default assumption: enumerate them ALL.
- Common size axes: length (Short/Regular/Long/XL), width (Regular/Wide), capacity (S/M/L), gender-specific (Men's/Women's)
- Sleeping pads: typically come in Short, Regular, Long, Regular Wide, Long Wide
- Sleeping bags: typically Short/Regular/Long, sometimes Wide variants
- Tents: typically 1P / 2P / 3P — each is a separate product, but variants of one product (e.g. Hubba Hubba) come in different person counts
- Bikepacking bags: often S/M/L or 4L/8L/14L volume options
- Only return a single "Standard" variant if you are CERTAIN the product has no size options at all
- Each variant must have accurate volumeLiters (packed) and weightGrams
- sizeLabel should match official product naming exactly (e.g. "Regular Wide", "Long", "2P")

You MUST respond ONLY with valid JSON — no markdown, no explanation, no code fences:
{
  "found": true,
  "names": { "en": "English name", "de": "German name", "ru": "Russian name" },
  "aliases": ["alias1", "alias2"],
  "variants": [
    { "sizeLabel": "Regular", "volumeLiters": 4.5, "weightGrams": 820 },
    { "sizeLabel": "Long",    "volumeLiters": 5.5, "weightGrams": 940 }
  ],
  "category": "sleep|shelter|clothing|cooking|tools|electronics|navigation|hygiene|food|water|other",
  "sourceUrl": "https://...",
  "confidence": "high|medium|low",
  "volumeNote": "brief note on how you determined the volume and which sizes were verified"
}

If genuinely not found or not identifiable as a physical item: {"found": false}
Set confidence="low" if you are estimating without finding official specs.`;
}

interface ClaudeNotFound { found: false }
interface ClaudeVariant { sizeLabel: string; volumeLiters: number; weightGrams?: number }
interface ClaudeFound {
  found: true;
  names: Record<string, string>;
  aliases: string[];
  variants: ClaudeVariant[];
  category: string;
  sourceUrl?: string;
  confidence: 'high' | 'medium' | 'low';
  volumeNote?: string;
}

function extractJson(text: string): ClaudeNotFound | ClaudeFound | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export class ClaudeGearSearchService implements IGearSearchService {
  private _client: Anthropic | null = null;

  private get client(): Anthropic {
    if (!this._client) {
      this._client = new Anthropic({ apiKey: process.env.VELOADOUT_API_KEY });
    }
    return this._client;
  }

  async search(query: string, depth: number = 1): Promise<GearSearchResult | null> {
    const d = Math.max(1, Math.min(3, Math.floor(depth)));
    try {
      const data = await this.searchWithWebSearch(query, d)
        ?? await this.searchWithKnowledge(query, d);
      if (!data) return null;
      return this.toResult(query, data);
    } catch (err) {
      console.error('[ClaudeGearSearchService] error:', err);
      return null;
    }
  }

  private async searchWithWebSearch(query: string, depth: number): Promise<ClaudeFound | null> {
    try {
      const maxUses = depth === 1 ? 3 : depth === 2 ? 6 : 10;
      const maxTurns = depth === 1 ? 5 : depth === 2 ? 8 : 12;
      const maxTokens = depth === 1 ? 2048 : 4096;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tools: any[] = [{ type: 'web_search_20250305', name: 'web_search', max_uses: maxUses }];
      const userPrompt = depth === 1
        ? `Find the packed volume and ALL available size variants for: "${query}"`
        : `The previous search for "${query}" returned an incomplete list of size variants. Run multiple web searches to enumerate every size offered for this product (Short / Regular / Long / Wide / S / M / L / etc.). Cross-check the manufacturer site and at least one retailer. Return ALL variants in the JSON response.`;
      const messages: Anthropic.MessageParam[] = [
        { role: 'user', content: userPrompt },
      ];

      // multi-turn loop to handle tool use
      for (let turn = 0; turn < maxTurns; turn++) {
        const response = await this.client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: maxTokens,
          system: systemPrompt(depth),
          tools,
          messages,
        });

        // collect text from this response
        const textBlocks = response.content.filter(b => b.type === 'text');
        if (textBlocks.length > 0) {
          const fullText = textBlocks.map(b => (b as Anthropic.TextBlock).text).join('');
          const parsed = extractJson(fullText);
          if (parsed?.found) return parsed as ClaudeFound;
          if (parsed && !parsed.found) return null;
        }

        if (response.stop_reason !== 'tool_use') break;

        // continue the conversation with tool results
        messages.push({ role: 'assistant', content: response.content });
        const toolResults: Anthropic.ToolResultBlockParam[] = response.content
          .filter(b => b.type === 'tool_use')
          .map(b => ({
            type: 'tool_result' as const,
            tool_use_id: (b as Anthropic.ToolUseBlock).id,
            content: '(results already incorporated by the server-side search tool)',
          }));
        messages.push({ role: 'user', content: toolResults });
      }

      return null;
    } catch (err) {
      console.warn('[ClaudeGearSearchService] web search failed, falling back:', err);
      return null;
    }
  }

  private async searchWithKnowledge(query: string, depth: number): Promise<ClaudeFound | null> {
    const response = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: systemPrompt(depth),
      messages: [
        { role: 'user', content: `From your knowledge, what is the packed volume and ALL size variants for: "${query}"? If you don't know, respond with {"found": false}.` },
      ],
    });

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as Anthropic.TextBlock).text)
      .join('');

    const parsed = extractJson(text);
    if (parsed?.found) return parsed as ClaudeFound;
    return null;
  }

  private toResult(query: string, data: ClaudeFound): GearSearchResult {
    const variants = data.variants ?? [];
    // compute average volume/weight from variants
    const avgVol = variants.length > 0
      ? Math.round((variants.reduce((s, v) => s + v.volumeLiters, 0) / variants.length) * 10) / 10
      : 0;
    const weights = variants.filter(v => v.weightGrams != null).map(v => v.weightGrams!);
    const avgWgt = weights.length > 0 ? Math.round(weights.reduce((s, w) => s + w, 0) / weights.length) : undefined;

    const item = GearItem.create({
      id: uuidv4(),
      names: data.names,
      aliases: [query.toLowerCase(), ...(data.aliases ?? [])],
      volumeLiters: avgVol,
      weightGrams: avgWgt,
      category: (data.category as GearCategory) ?? GearCategory.OTHER,
      sourceUrl: data.sourceUrl,
      verifiedAt: new Date(),
      createdAt: new Date(),
      variants,
    });

    return {
      item,
      confidence: data.confidence ?? 'medium',
      sourceUrl: data.sourceUrl,
      volumeNote: data.volumeNote,
    };
  }
}
