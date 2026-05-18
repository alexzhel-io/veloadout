import type { BagSlotKey } from './BagRecommendation';

/**
 * A specific real-world bag product the user can pick to fill a slot.
 * Mirrors the `bag_products` table.
 *
 * Why separate from GearItem: bags are containers, not gear. The gear
 * catalog has a hard blocklist on bag brands (see bagBlocklist.ts) to
 * keep them out of search results — `bag_products` is the curated home
 * for the same brands, used only by the bag picker.
 */
export interface BagProduct {
  id: string;                // slug; primary key
  brand: string;
  model: string;
  slot: BagSlotKey;          // which slot it fills
  paired: boolean;           // single bag of a pair (fork, panniers)
  capacityPerBagL: number;
  weightGrams?: number;
  imageUrl?: string;         // Amazon CDN or manufacturer
  amazonAsin?: string;       // direct affiliate link target
  sourceUrl?: string;        // manufacturer page fallback
  priceEur?: number;
}
