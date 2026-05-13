'use client';

import { useTranslations } from 'next-intl';
import { LegalLayout } from '@/presentation/components/LegalLayout';

export default function HelpPage() {
  const t = useTranslations('help');

  return (
    <LegalLayout title={t('title')}>
      <p>{t('intro')}</p>

      <h2>{t('steps_title')}</h2>
      <ol className="list-decimal pl-6 space-y-2">
        <li>{t('step_1')}</li>
        <li>{t('step_2')}</li>
        <li>{t('step_3')}</li>
        <li>{t('step_4')}</li>
      </ol>

      <h2>{t('search_title')}</h2>
      <p>{t('search_body')}</p>

      <h2>{t('account_title')}</h2>
      <p>{t('account_body')}</p>

      <h2>{t('tips_title')}</h2>
      <ul>
        <li>{t('tip_1')}</li>
        <li>{t('tip_2')}</li>
        <li>{t('tip_3')}</li>
      </ul>
    </LegalLayout>
  );
}
