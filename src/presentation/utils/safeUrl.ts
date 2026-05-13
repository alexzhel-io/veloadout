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
 * affiliate-rewritten before the user lands on the manufacturer page.
 * Returns undefined for non-http(s) inputs.
 */
export function trackedOutboundUrl(rawUrl: string | undefined | null, itemId?: string): string | undefined {
  const safe = safeHttpUrl(rawUrl);
  if (!safe) return undefined;
  const params = new URLSearchParams({ to: safe });
  if (itemId) params.set('item', itemId);
  return `/r?${params.toString()}`;
}
