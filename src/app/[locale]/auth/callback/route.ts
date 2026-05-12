import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const code = req.nextUrl.searchParams.get('code');

  if (code) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(`/${locale}`, req.url));
}
