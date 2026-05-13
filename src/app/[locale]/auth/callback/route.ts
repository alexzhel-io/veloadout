import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { routing } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  // Reject unknown locales — fall back to default rather than landing on a broken page
  const locale = (routing.locales as readonly string[]).includes(raw) ? raw : routing.defaultLocale;

  const code = req.nextUrl.searchParams.get('code');
  const errorParam = req.nextUrl.searchParams.get('error');
  const errorDescription = req.nextUrl.searchParams.get('error_description');

  if (errorParam) {
    console.error('[auth callback] provider error:', errorParam, errorDescription);
    return NextResponse.redirect(new URL(`/${locale}?auth_error=${encodeURIComponent(errorParam)}`, req.url));
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[auth callback] exchange failed:', error.message);
      return NextResponse.redirect(new URL(`/${locale}?auth_error=exchange_failed`, req.url));
    }
  }

  return NextResponse.redirect(new URL(`/${locale}`, req.url));
}
