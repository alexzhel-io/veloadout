'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export function CookieBanner() {
  const t = useTranslations('cookies');
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem('veloadout-cookie-consent')) setShow(true);
  }, []);

  const accept = () => {
    localStorage.setItem('veloadout-cookie-consent', 'accepted');
    setShow(false);
  };

  const decline = () => {
    localStorage.setItem('veloadout-cookie-consent', 'declined');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:max-w-md z-50 bg-[#1c1a2e] border border-white/[0.1] rounded-2xl p-5 shadow-2xl">
      <p className="text-white text-sm mb-1 font-medium">{t('title')}</p>
      <p className="text-text-secondary text-xs mb-4">{t('description')}</p>
      <div className="flex gap-2">
        <button
          onClick={accept}
          className="flex-1 px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg text-white text-xs font-medium transition-colors"
        >
          {t('accept')}
        </button>
        <button
          onClick={decline}
          className="px-4 py-2 border border-white/[0.1] hover:border-white/30 rounded-lg text-text-secondary hover:text-white text-xs transition-colors"
        >
          {t('decline')}
        </button>
      </div>
    </div>
  );
}
