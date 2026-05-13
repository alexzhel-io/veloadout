/**
 * Bikepacking bags are deliberately excluded from the gear catalog.
 *
 * The app recommends bags based on the total volume of *gear* the rider
 * is carrying. Putting bags themselves into that calculation would be
 * incoherent — like measuring a suitcase using a smaller suitcase.
 *
 * This module centralises the detection rules so both server-side
 * validation (POST /api/lookup, AI response filter) and the cleanup
 * SQL agree on what counts as a bag.
 */

// Brand names that almost exclusively make bikepacking bags. If a brand
// also makes non-bags (e.g. Specialized, Topeak make many things) we
// rely on the generic keyword check below instead.
const BAG_BRANDS = [
  'ortlieb',
  'apidura',
  'restrap',
  'revelate designs',
  'revelate',
  'tailfin',
  'rockgeist',
  'bedrock bags',
  'wizard works',
  'porcelain rocket',
  'bikepacking.com',
  'roswheel',
  'rhinowalk',
  'lone peak',
  'acepac',
];

// Generic terms that always describe a bike-mounted bag. We match these
// as whole words / hyphenated phrases to avoid false positives like
// "sleeping bag", "stuff sack", "compression sack".
const BAG_PHRASES = [
  'seat pack',
  'seat bag',
  'saddle bag',
  'saddle pack',
  'frame bag',
  'frame pack',
  'half-frame bag',
  'full-frame bag',
  'top tube bag',
  'top-tube bag',
  'feed bag',
  'gas tank bag',
  'fork bag',
  'fork pack',
  'cage bag',
  'handlebar bag',
  'handlebar pack',
  'handlebar roll',
  'handlebar harness',
  'bar bag',
  'bar roll',
  'pannier',
  'panniers',
  'rack bag',
  'rack pack',
  'trunk bag',
  'bikepacking bag',
];

function normalise(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Returns true if a query/name looks like a bikepacking bag and should
 * be rejected from the catalog.
 *
 * Conservative: only matches obvious cases. False negatives (a bag we
 * miss) are fine — the user just gets a less useful catalog entry.
 * False positives (rejecting a non-bag) would frustrate users.
 */
export function looksLikeBikepackingBag(name: string): boolean {
  const n = normalise(name);
  if (!n) return false;

  for (const brand of BAG_BRANDS) {
    if (n.includes(brand)) return true;
  }
  for (const phrase of BAG_PHRASES) {
    // Phrase boundary check: must be surrounded by start/end/space/hyphen
    const re = new RegExp(`(^|[\\s-])${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(s)?($|[\\s-])`);
    if (re.test(n)) return true;
  }
  return false;
}
