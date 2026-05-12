import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { GearCalculator } from '@/presentation/components/GearCalculator';

export default async function HomePage() {
  let user = null;
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    user = data.user ? { id: data.user.id, email: data.user.email ?? undefined } : null;
  } catch { /* Supabase not configured */ }

  return <GearCalculator user={user} />;
}
