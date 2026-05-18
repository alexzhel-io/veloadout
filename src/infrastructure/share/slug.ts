import { randomBytes } from 'crypto';

/**
 * URL-friendly random slug for sharing links.
 * 8 chars from a 64-symbol alphabet ⇒ ~2.8×10^14 combinations — collision-safe
 * for the foreseeable future without a uniqueness retry loop.
 */
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateShareSlug(length = 8): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/** Validate a slug coming from a URL param — defends against weird input
 *  before hitting the DB. */
export function isValidShareSlug(slug: string): boolean {
  return /^[a-z0-9]{6,16}$/.test(slug);
}
