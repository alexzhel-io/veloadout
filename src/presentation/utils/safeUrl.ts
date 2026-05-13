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
