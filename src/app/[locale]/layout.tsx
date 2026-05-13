import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import { ToastProvider } from '@/presentation/components/Toast';
import { CookieBanner } from '@/presentation/components/CookieBanner';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const title = t('title');
  const description = t('description');
  const url = `https://veloadout.com/${locale}`;
  return {
    title,
    description,
    metadataBase: new URL('https://veloadout.com'),
    alternates: {
      canonical: url,
      languages: { en: '/en', de: '/de', uk: '/uk', ru: '/ru' },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Veloadout',
      type: 'website',
      locale: locale === 'ru' ? 'ru_RU' : locale === 'uk' ? 'uk_UA' : locale === 'de' ? 'de_DE' : 'en_US',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Veloadout',
    url: 'https://veloadout.com',
    description: 'Bikepacking gear volume calculator — plan your bike touring setup',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    inLanguage: ['en', 'de', 'uk', 'ru'],
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };

  return (
    <html lang={locale}>
      <body>
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <Script
            defer
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
          />
        )}
        <NextIntlClientProvider messages={messages}>
          <ToastProvider>
            {children}
            <CookieBanner />
          </ToastProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
