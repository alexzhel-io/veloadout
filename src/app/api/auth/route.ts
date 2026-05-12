import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { checkRateLimit } from '@/infrastructure/security/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const loginSchema = z.object({
  email: z.string().email().max(254),
  locale: z.enum(['en', 'de', 'ru']),
});

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';
}

function siteUrl(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const proto = req.headers.get('x-forwarded-proto') ?? 'http';
  const host = req.headers.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  const body = loginSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  // Rate-limit by IP and email to prevent magic-link spam
  const ip = clientIp(req);
  const ipLimit = await checkRateLimit(`auth:ip:${ip}`, 5, 600);
  const emailLimit = await checkRateLimit(`auth:email:${body.data.email}`, 3, 600);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again in a few minutes.' }, { status: 429 });
  }

  const supabase = await createServerSupabaseClient();
  const redirectUrl = `${siteUrl(req)}/${body.data.locale}/auth/callback`;

  const { error } = await supabase.auth.signInWithOtp({
    email: body.data.email,
    options: { emailRedirectTo: redirectUrl },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
