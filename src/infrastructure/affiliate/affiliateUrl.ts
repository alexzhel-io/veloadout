/**
 * Wrap an outbound product URL for affiliate tracking.
 *
 * Today: identity — returns the URL unchanged.
 * Later: a domain-keyed lookup that appends partner tags (e.g.
 *   REI ?ic_id=, Amazon ?tag=, Backcountry ?CMP_ID=).
 *
 * Why exists today even though it does nothing: every product link in
 * the UI already goes through here, so plugging in real affiliate IDs
 * is a one-file change — no DB migration, no per-row rewrites.
 */
export function buildAffiliateUrl(rawUrl: string): string {
  // Parse defensively. Invalid URLs are returned as-is so the redirect
  // handler can decide whether to reject them.
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  // Hook point: switch on hostname when partner programs are signed.
  // Example (not active yet):
  //   if (u.hostname.endsWith('rei.com')) u.searchParams.set('ic_id', '<our-id>');
  //   if (u.hostname.endsWith('amazon.de')) u.searchParams.set('tag', '<our-tag-21>');

  return u.toString();
}
