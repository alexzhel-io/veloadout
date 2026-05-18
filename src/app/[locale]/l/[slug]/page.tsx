import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { headers } from 'next/headers';
import { SharedListView } from '@/presentation/components/SharedListView';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'share' });
  return {
    title: `${t('shared_title')} — Veloadout`,
    description: t('shared_description'),
    // Don't index user-generated public pages.
    robots: { index: false, follow: false },
  };
}

async function fetchSharedList(slug: string) {
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host = h.get('host') ?? 'veloadout.com';
  const res = await fetch(`${proto}://${host}/api/list/${slug}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load shared list: ${res.status}`);
  return res.json();
}

export default async function SharedListPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'share' });

  const data = await fetchSharedList(slug);
  if (!data) notFound();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#13111c' }}>
      <header className="border-b border-white/[0.07] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <Link href={`/${locale}`} className="flex items-center gap-3 shrink-0 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-white text-sm font-bold">V</span>
            </div>
            <span className="font-semibold text-white tracking-tight">Veloadout</span>
          </Link>
          <Link
            href={`/${locale}`}
            className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors"
          >
            {t('build_your_own')}
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-10">
        <div className="max-w-4xl mx-auto">
          <SharedListView data={data} />
        </div>
      </main>
    </div>
  );
}
