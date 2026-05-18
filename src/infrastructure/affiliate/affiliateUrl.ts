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
const AMAZON_DE_TAG = 'veloadout-21';

export function buildAffiliateUrl(rawUrl: string, productName?: string): string {
  // Best case: build an Amazon search URL by product name. This is what
  // monetises most clicks since catalog sourceUrls typically point to
  // manufacturer pages, not Amazon listings.
  if (productName && productName.trim().length > 0) {
    const q = encodeURIComponent(productName.trim());
    return `https://www.amazon.de/s?k=${q}&tag=${AMAZON_DE_TAG}`;
  }

  // Fall back to URL-based handling.
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  // If already pointing at Amazon, just attach our tag.
  if (u.hostname.endsWith('amazon.de') || u.hostname.endsWith('amazon.com.de')) {
    u.searchParams.set('tag', AMAZON_DE_TAG);
    return u.toString();
  }

  // Hook point for future programs (REI, Backcountry, etc.). For now,
  // pass non-Amazon URLs through unchanged.
  return u.toString();
}
