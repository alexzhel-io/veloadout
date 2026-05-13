/**
 * Cheap heuristic checks to reject obvious garbage queries before we burn
 * an Anthropic call on them. Conservative — false-negatives are cheap (one
 * extra AI call), false-positives are not (legitimate user is blocked).
 */
export function looksLikeGarbage(query: string): boolean {
  const q = query.trim();
  if (q.length < 3 || q.length > 80) return true;

  // Must contain at least one letter (ASCII or Cyrillic)
  if (!/[a-zа-яёÄÖÜäöüß]/i.test(q)) return true;

  // Too few unique characters — `aaaaaa`, `abcabcabc`, etc.
  const unique = new Set(q.toLowerCase().replace(/\s+/g, ''));
  if (unique.size < 3) return true;

  // Single character repeated 5+ times anywhere
  if (/(.)\1{4,}/.test(q)) return true;

  // Mostly non-alphanumeric (>40% punctuation/symbols)
  const nonAlpha = q.replace(/[a-zа-яёÄÖÜäöüß0-9\s]/gi, '').length;
  if (nonAlpha / q.length > 0.4) return true;

  // Random-looking keymash: long runs without vowels or spaces
  const tokens = q.split(/\s+/);
  const longGarbageToken = tokens.some(t =>
    t.length >= 8 && !/[aeiouAEIOUаеёиоуыэюяäöüÄÖÜ]/.test(t)
  );
  if (longGarbageToken) return true;

  return false;
}
