/**
 * Returns the URL only if it's a safe http(s) URL. Returns undefined for
 * anything else (javascript:, data:, file:, malformed). Defends against
 * legacy DB rows or AI responses that bypassed validation.
 */
export function safeHttpUrl(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Wraps an outbound product URL in our /r tracking redirect.
 * Click goes through our serverless function, gets counted, and is
 * affiliate-rewritten before the user lands on Amazon (when a product
 * name is supplied) or the original URL.
 * Returns undefined for non-http(s) inputs.
 */
export function trackedOutboundUrl(
  rawUrl: string | undefined | null,
  itemId?: string,
  productName?: string,
  amazonAsin?: string,
  marketplace?: 'de' | 'us',
): string | undefined {
  const safe = safeHttpUrl(rawUrl);
  // Pick a benign placeholder `to` if we have no real source URL.
  // buildAffiliateUrl will ignore it when productName/ASIN is given.
  const fallbackHost = marketplace === 'de' ? 'https://www.amazon.de/' : 'https://www.amazon.com/';
  const to = safe ?? ((productName || amazonAsin) ? fallbackHost : undefined);
  if (!to) return undefined;
  const params = new URLSearchParams({ to });
  if (itemId) params.set('item', itemId);
  if (productName) params.set('q', productName);
  if (amazonAsin) params.set('asin', amazonAsin);
  if (marketplace) params.set('mkt', marketplace);
  return `/r?${params.toString()}`;
}
