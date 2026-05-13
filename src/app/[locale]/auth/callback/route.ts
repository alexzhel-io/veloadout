import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { routing } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  // Reject unknown locales — fall back to default rather than landing on a broken page
  const locale = (routing.locales as readonly string[]).includes(raw) ? raw : routing.defaultLocale;

  const code = req.nextUrl.searchParams.get('code');
  if (code) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(`/${locale}`, req.url));
}
