'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { BagRecommendation, BagSlot } from '@/domain/gear/BagRecommendation';

interface Props {
  recommendation: BagRecommendation;
}

function SlotCard({ slot, label }: { slot: BagSlot; label: string }) {
  const t = useTranslations('bags');
  const locale = useLocale();
  const name = slot.name[locale] ?? slot.name['en'];
  const fillColor =
    slot.fillPercent >= 90 ? '#f03d3d' :
    slot.fillPercent >= 70 ? '#f0a400' :
    '#6d4aff';

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-white text-sm font-medium">{name}</p>
          <p className="text-text-muted text-xs mt-0.5">
            {slot.typicalRangeL[0]}–{slot.typicalRangeL[1]}L range
          </p>
        </div>
        <span className="text-white font-bold text-lg">{slot.recommendedL}L</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${slot.fillPercent}%`, backgroundColor: fillColor }}
        />
      </div>
      <p className="text-text-muted text-xs mt-1.5">{slot.fillPercent}% {t('fill')}</p>
    </div>
  );
}

export function BagRecommendationPanel({ recommendation }: Props) {
  const t = useTranslations('bags');

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#1c1a2e] shadow-card overflow-hidden h-fit">
      <div className="px-5 py-4 border-b border-white/[0.07]">
        <h2 className="text-white font-medium text-sm">{t('title')}</h2>
        <p className="text-text-muted text-xs mt-0.5">{t('subtitle')}</p>
      </div>

      <div className="p-4 space-y-3">
        <SlotCard slot={recommendation.handlebar} label="handlebar" />
        <SlotCard slot={recommendation.frame} label="frame" />
        <SlotCard slot={recommendation.seatpack} label="seatpack" />
      </div>

      <div className="px-5 py-4 border-t border-white/[0.07] flex justify-between items-center bg-white/[0.02]">
        <span className="text-text-secondary text-sm">Total</span>
        <span className="text-white font-bold text-xl">{recommendation.total.toFixed(1)}L</span>
      </div>
    </div>
  );
}
