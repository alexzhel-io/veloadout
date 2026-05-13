'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

const LOCALES = [
  { code: 'en', label: 'EN' },
  { code: 'de', label: 'DE' },
  { code: 'uk', label: 'UA' },
  { code: 'ru', label: 'RU' },
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(next: string) {
    const segments = pathname.split('/');
    segments[1] = next;
    router.push(segments.join('/') || '/');
  }

  return (
    <div className="flex items-center gap-1 bg-white/[0.05] rounded-lg p-0.5">
      {LOCALES.map(l => (
        <button
          key={l.code}
          onClick={() => switchLocale(l.code)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            locale === l.code
              ? 'bg-accent text-white shadow-sm'
              : 'text-text-secondary hover:text-white'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
