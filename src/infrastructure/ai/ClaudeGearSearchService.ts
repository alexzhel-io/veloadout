import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { GearItem } from '@/domain/gear/GearItem';
import { GearCategory } from '@/domain/gear/GearCategory';
import { IGearSearchService, GearSearchResult } from '@/domain/gear/IGearSearchService';

const SYSTEM_PROMPT = `You are a gear database assistant for bikepacking.
Your task: given a query about a piece of gear or equipment, find its packed volume in liters.

Use web search to find the exact product specifications if it's a branded item.
For generic items, use typical values from your knowledge.

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{
  "found": true,
  "names": {
    "en": "English name",
    "de": "German name",
    "ru": "Russian name"
  },
  "aliases": ["alias1", "alias2"],
  "volumeLiters": 9.5,
  "weightGrams": 850,
  "category": "sleep|shelter|clothing|cooking|tools|electronics|navigation|hygiene|food|water|other",
  "sourceUrl": "https://...",
  "confidence": "high|medium|low"
}

If the item cannot be found or identified, respond with:
{"found": false}

Categories: sleep, shelter, clothing, cooking, tools, electronics, navigation, hygiene, food, water, other
Volume rules: packed/compressed volume, not uncompressed. For bags/containers use their rated capacity.`;

interface ClaudeResponse {
  found: false;
}
interface ClaudeFoundResponse {
  found: true;
  names: Record<string, string>;
  aliases: string[];
  volumeLiters: number;
  weightGrams?: number;
  category: string;
  sourceUrl?: string;
  confidence: 'high' | 'medium' | 'low';
}

export class ClaudeGearSearchService implements IGearSearchService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async search(query: string): Promise<GearSearchResult | null> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 } as any],
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Find the packed volume for: "${query}"`,
          },
        ],
      });

      const textBlock = response.content.find(b => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') return null;

      let parsed: ClaudeResponse | ClaudeFoundResponse;
      try {
        const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }

      if (!parsed.found) return null;

      const data = parsed as ClaudeFoundResponse;

      const item = GearItem.create({
        id: uuidv4(),
        names: data.names,
        aliases: [query.toLowerCase(), ...(data.aliases ?? [])],
        volumeLiters: data.volumeLiters,
        weightGrams: data.weightGrams,
        category: (data.category as GearCategory) ?? GearCategory.OTHER,
        sourceUrl: data.sourceUrl,
        verifiedAt: new Date(),
        createdAt: new Date(),
      });

      return {
        item,
        confidence: data.confidence ?? 'medium',
        sourceUrl: data.sourceUrl,
      };
    } catch (err) {
      console.error('[ClaudeGearSearchService] error:', err);
      return null;
    }
  }
}
