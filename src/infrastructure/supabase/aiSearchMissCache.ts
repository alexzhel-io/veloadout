import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

function normalize(q: string): string {
  return q.toLowerCase().replace(/\s+/g, ' ').trim();
}

const CACHE_TTL_HOURS = 24;

/**
 * Returns true if this query has been marked as a not_found miss within
 * the TTL window. Failures are non-fatal — we fall through to AI on
 * read errors rather than block legitimate searches.
 */
export async function isCachedMiss(supabase: SupabaseClient, query: string): Promise<boolean> {
  const norm = normalize(query);
  if (!norm) return false;
  try {
    const { data, error } = await supabase
      .from('ai_search_misses')
      .select('expires_at')
      .eq('query_norm', norm)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (error) {
      console.warn('[aiSearchMissCache] read failed:', error.message);
      return false;
    }
    return !!data;
  } catch (err) {
    console.warn('[aiSearchMissCache] read threw:', err);
    return false;
  }
}

/**
 * Records a not_found miss with a 24h TTL. Idempotent via upsert.
 * Non-fatal on failure: we still return not_found to the user.
 */
export async function recordMiss(supabase: SupabaseClient, query: string): Promise<void> {
  const norm = normalize(query);
  if (!norm) return;
  const expires = new Date(Date.now() + CACHE_TTL_HOURS * 3600 * 1000).toISOString();
  try {
    const { error } = await supabase
      .from('ai_search_misses')
      .upsert({ query_norm: norm, expires_at: expires }, { onConflict: 'query_norm' });
    if (error) {
      console.warn('[aiSearchMissCache] write failed:', error.message);
    }
  } catch (err) {
    console.warn('[aiSearchMissCache] write threw:', err);
  }
}
