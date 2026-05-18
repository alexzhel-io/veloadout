/**
 * Wrap an outbound product URL for affiliate tracking.
 *
 * Strategy:
 * - If a `productName` is given, ALWAYS route to Amazon DE search with our
 *   tag — captures the click for monetisation regardless of the original
 *   sourceUrl (which usually points to manufacturer spec pages we earn
 *   nothing from).
 * - If the URL is already an Amazon domain, just append/replace the tag.
 * - Otherwise, return as-is — defensive fallback when no product name is
 *   known (rare path).
 *
 * Tag policy: `veloadout-21` for amazon.de. Add new tags per marketplace
 * when we register US/UK/etc. The Amazon DE program is "conditional
 * approval" — we need 3 qualified sales within 180 days for full approval.
 */
/**
 * Per-marketplace Amazon tags. Each marketplace is a separate Associates
 * program — register once per region in their respective Partnernets.
 *
 * - DE active. Conditional approval; needs 3 qualified sales / 180 days.
 * - US active. Same conditional-approval rule applies independently.
 *
 * Tag formats are convention only — Amazon assigns the suffix
 * (DE → -21, US → -20, UK → -21 too).
 */
const AMAZON_TAGS = {
  de: { host: 'www.amazon.de', tag: 'veloadout-21' },
  us: { host: 'www.amazon.com', tag: 'veloadout-20' }, // TODO: paste real US tag when approved
} as const;

export type AmazonMarketplace = keyof typeof AMAZON_TAGS;

const ASIN_RE = /^[A-Z0-9]{10}$/;

/**
 * Priority order:
 *  1. amazonAsin — direct product page, highest conversion.
 *  2. productName — Amazon search.
 *  3. rawUrl manipulation — tag-rewrite if URL is already Amazon, else passthrough.
 *
 * Marketplace selection: defaults to 'us' since that's the broadest
 * English-speaking audience; explicit override via `marketplace` arg
 * (the UI passes the user's current locale → marketplace mapping).
 */
export function buildAffiliateUrl(
  rawUrl: string,
  productName?: string,
  amazonAsin?: string,
  marketplace: AmazonMarketplace = 'us',
): string {
  const { host, tag } = AMAZON_TAGS[marketplace];

  // Direct ASIN — best path. Validate format to avoid emitting junk URLs.
  if (amazonAsin && ASIN_RE.test(amazonAsin)) {
    return `https://${host}/dp/${amazonAsin}?tag=${tag}`;
  }

  // Fallback to search by product name.
  if (productName && productName.trim().length > 0) {
    const q = encodeURIComponent(productName.trim());
    return `https://${host}/s?k=${q}&tag=${tag}`;
  }

  // Fall back to URL-based handling.
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  // Already pointing at any Amazon marketplace — attach the matching tag.
  if (u.hostname.endsWith('amazon.de')) {
    u.searchParams.set('tag', AMAZON_TAGS.de.tag);
    return u.toString();
  }
  if (u.hostname.endsWith('amazon.com') || u.hostname.endsWith('amazon.com.de')) {
    u.searchParams.set('tag', AMAZON_TAGS.us.tag);
    return u.toString();
  }

  return u.toString();
}

/**
 * Map a UI locale to the best Amazon marketplace. `de` → amazon.de;
 * everything else → amazon.com (US has the widest catalogue and English
 * is the common-denominator UI for `en`/`uk`/`ru` visitors).
 */
export function marketplaceForLocale(locale: string): AmazonMarketplace {
  return locale === 'de' ? 'de' : 'us';
}
