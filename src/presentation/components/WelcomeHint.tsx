'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Sparkles, X, ArrowRight } from 'lucide-react';

const STORAGE_KEY = 'veloadout:welcome-dismissed-v1';

export function WelcomeHint() {
  const t = useTranslations('welcome');
  const locale = useLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== '1') setVisible(true);
    } catch { /* localStorage unavailable — just don't show */ }
  }, []);

  if (!visible) return null;

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    setVisible(false);
  }

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 animate-slide-up relative">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 text-text-muted hover:text-white transition-colors"
      >
        <X size={16} />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="shrink-0 w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center mt-0.5">
          <Sparkles size={16} className="text-accent" />
        </div>
        <div className="space-y-2">
          <h3 className="text-white font-semibold tracking-tight">{t('title')}</h3>
          <p className="text-text-secondary text-sm">{t('body')}</p>
          <a
            href={`/${locale}/help`}
            className="inline-flex items-center gap-1.5 text-accent hover:text-accent-hover text-sm font-medium transition-colors"
          >
            {t('cta')} <ArrowRight size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
