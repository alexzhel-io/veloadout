import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { GearItem } from '@/domain/gear/GearItem';
import { GearCategory } from '@/domain/gear/GearCategory';
import { IGearSearchService, GearSearchResult } from '@/domain/gear/IGearSearchService';

const SYSTEM_PROMPT = `You are a gear database assistant for bikepacking and cycling.
Your task: find the PACKED/COMPRESSED volume in liters for the item the user asks about.

Use web search to find exact product specs. Search for "<product name> packed size" or "<product name> stuff sack dimensions".

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
  "volumeNote": "brief note on how you determined the volume"
}

VARIANT RULES:
- Always include ALL available size variants (Regular, Long, Wide, S/M/L, etc.)
- If item has only one size, put it as a single-element variants array with sizeLabel="Standard"
- Each variant must have accurate volumeLiters (packed) and weightGrams
- sizeLabel should match official product naming

If genuinely not found or not identifiable as a physical item: {"found": false}
Set confidence="low" if you are estimating without finding official specs.`;

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

  async search(query: string): Promise<GearSearchResult | null> {
    try {
      const data = await this.searchWithWebSearch(query)
        ?? await this.searchWithKnowledge(query);
      if (!data) return null;
      return this.toResult(query, data);
    } catch (err) {
      console.error('[ClaudeGearSearchService] error:', err);
      return null;
    }
  }

  private async searchWithWebSearch(query: string): Promise<ClaudeFound | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tools: any[] = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }];
      const messages: Anthropic.MessageParam[] = [
        { role: 'user', content: `Find the packed volume for: "${query}"` },
      ];

      // multi-turn loop to handle tool use
      for (let turn = 0; turn < 5; turn++) {
        const response = await this.client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
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

  private async searchWithKnowledge(query: string): Promise<ClaudeFound | null> {
    const response = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: `From your knowledge, what is the packed volume for: "${query}"? If you don't know, respond with {"found": false}.` },
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
