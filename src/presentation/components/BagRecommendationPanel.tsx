'use client';

import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import type { BagRecommendation, BagSlot, BagDistributionMode, BagCapacities } from '@/domain/gear/BagRecommendation';

interface Props {
  recommendation: BagRecommendation;
  mode: BagDistributionMode;
  onModeChange: (m: BagDistributionMode) => void;
  capacities: BagCapacities;
  onCapacityChange: (key: keyof BagCapacities, value: number) => void;
}

function SlotCard({
  slot,
  onCapacityChange,
}: {
  slot: BagSlot;
  onCapacityChange: (value: number) => void;
}) {
  const t = useTranslations('bags');
  const locale = useLocale();
  const name = slot.name[locale] ?? slot.name['en'];
  const fillColor =
    slot.overflow ? '#f03d3d' :
    slot.fillPercent >= 90 ? '#f0a400' :
    '#6d4aff';

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-white text-sm font-medium truncate">{name}</p>
          <p className="text-text-muted text-xs mt-0.5">
            {slot.typicalRangeL[0]}–{slot.typicalRangeL[1]}L {t('typical')}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-1">
          <input
            type="number"
            min={0}
            max={50}
            step={0.5}
            value={slot.capacityL}
            onChange={e => onCapacityChange(parseFloat(e.target.value) || 0)}
            className="w-16 bg-[#252340] border border-white/[0.07] rounded-md px-2 py-1 text-white text-sm text-right focus:outline-none focus:border-accent/60"
            aria-label={`${name} capacity in litres`}
          />
          <span className="text-text-muted text-xs">L</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${slot.fillPercent}%`, backgroundColor: fillColor }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-text-muted text-xs">
          {slot.assignedL.toFixed(1)} / {slot.capacityL.toFixed(1)}L · {slot.fillPercent}%
        </p>
        {slot.overflow && (
          <span className="flex items-center gap-1 text-danger text-xs">
            <AlertTriangle size={12} /> {t('overflow')}
          </span>
        )}
      </div>
    </div>
  );
}

export function BagRecommendationPanel({
  recommendation,
  mode,
  onModeChange,
  capacities,
  onCapacityChange,
}: Props) {
  const t = useTranslations('bags');
  const overCapacity = mode === 'cumulative' && recommendation.total > recommendation.totalCapacity;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#1c1a2e] shadow-card overflow-hidden h-fit">
      <div className="px-5 py-4 border-b border-white/[0.07]">
        <h2 className="text-white font-medium text-sm">{t('title')}</h2>
        <p className="text-text-muted text-xs mt-0.5">{t('subtitle')}</p>
      </div>

      <div className="px-5 py-3 border-b border-white/[0.07] bg-white/[0.02]">
        <p className="text-text-muted text-xs mb-2">{t('mode_label')}</p>
        <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5">
          <button
            onClick={() => onModeChange('cumulative')}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              mode === 'cumulative'
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            {t('mode_cumulative')}
          </button>
          <button
            onClick={() => onModeChange('each')}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              mode === 'each'
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            {t('mode_each')}
          </button>
        </div>
        <p className="text-text-muted text-xs mt-2 leading-snug">
          {mode === 'cumulative' ? t('mode_cumulative_hint') : t('mode_each_hint')}
        </p>
      </div>

      <div className="p-4 space-y-3">
        <SlotCard slot={recommendation.handlebar} onCapacityChange={v => onCapacityChange('handlebar', v)} />
        <SlotCard slot={recommendation.frame} onCapacityChange={v => onCapacityChange('frame', v)} />
        <SlotCard slot={recommendation.seatpack} onCapacityChange={v => onCapacityChange('seatpack', v)} />
      </div>

      <div className="px-5 py-4 border-t border-white/[0.07] flex justify-between items-center bg-white/[0.02]">
        <div>
          <span className="text-text-secondary text-sm">{t('gear_total')}</span>
          {overCapacity && (
            <p className="text-danger text-xs mt-0.5 flex items-center gap-1">
              <AlertTriangle size={11} /> {t('overflow_total')}
            </p>
          )}
        </div>
        <div className="text-right">
          <span className="text-white font-bold text-xl">{recommendation.total.toFixed(1)}L</span>
          <p className="text-text-muted text-xs">
            {t('capacity')}: {recommendation.totalCapacity.toFixed(1)}L
          </p>
        </div>
      </div>
    </div>
  );
}
