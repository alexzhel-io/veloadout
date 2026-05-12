import { createClient } from '@supabase/supabase-js';

// Plain anon client — no cookie handling, for server-side writes to public catalog
let _client: ReturnType<typeof createClient> | null = null;

export function getAnonClient() {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _client;
}
