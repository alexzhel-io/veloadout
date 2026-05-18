'use client';

import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import { AlertTriangle, ShoppingBag, ExternalLink, X as XIcon } from 'lucide-react';
import { trackedOutboundUrl } from '@/presentation/utils/safeUrl';
import { marketplaceForLocale } from '@/infrastructure/affiliate/affiliateUrl';
import type { BagProduct } from '@/domain/gear/BagProduct';
import type { BagRecommendation, BagSlot, BagDistributionMode, BagCapacities, BagActive, BagSlotKey } from '@/domain/gear/BagRecommendation';

interface Props {
  recommendation: BagRecommendation;
  mode: BagDistributionMode;
  onModeChange: (m: BagDistributionMode) => void;
  capacities: BagCapacities;
  onCapacityChange: (key: keyof BagCapacities, value: number) => void;
  active: BagActive;
  onActiveChange: (key: keyof BagActive, value: boolean) => void;
  picks: Partial<Record<BagSlotKey, BagProduct | undefined>>;
  onPickClick: (slot: BagSlotKey) => void;
  onUnpick: (slot: BagSlotKey) => void;
}

function SlotCard({
  slot,
  pickedBag,
  onCapacityChange,
  onActiveToggle,
  onPickClick,
  onUnpick,
}: {
  slot: BagSlot;
  pickedBag?: BagProduct;
  onCapacityChange: (value: number) => void;
  onActiveToggle: (next: boolean) => void;
  onPickClick: () => void;
  onUnpick: () => void;
}) {
  const t = useTranslations('bags');
  const locale = useLocale();
  const name = slot.name[locale] ?? slot.name['en'];
  const fillColor =
    !slot.active ? '#3a3650' :
    slot.overflow ? '#f03d3d' :
    slot.fillPercent >= 90 ? '#f0a400' :
    '#6d4aff';

  // When a bag is picked, the affiliate buy link is built per-row.
  // Marketplace per locale: /de → amazon.de, others → amazon.com.
  const buyUrl = pickedBag
    ? trackedOutboundUrl(
        pickedBag.sourceUrl,
        pickedBag.id,
        `${pickedBag.brand} ${pickedBag.model}`,
        pickedBag.amazonAsin,
        marketplaceForLocale(locale),
      )
    : undefined;

  return (
    <div className={`rounded-xl border p-4 transition-opacity ${
      slot.active
        ? 'border-white/[0.07] bg-white/[0.03]'
        : 'border-white/[0.04] bg-white/[0.02] opacity-50'
    }`}>
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="min-w-0 flex-1 flex items-start gap-2">
          <input
            type="checkbox"
            checked={slot.active}
            onChange={e => onActiveToggle(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-white/20 bg-[#252340] text-accent focus:ring-accent/40 cursor-pointer accent-accent shrink-0"
            aria-label={`${slot.active ? 'Disable' : 'Enable'} ${name}`}
          />
          {/* Inline thumbnail when a specific bag is picked — saves a row */}
          {pickedBag && (
            <div className="shrink-0 w-9 h-9 rounded-md bg-white/[0.05] flex items-center justify-center overflow-hidden mt-0.5">
              {pickedBag.imageUrl ? (
                <Image src={pickedBag.imageUrl} alt={`${pickedBag.brand} ${pickedBag.model}`} width={36} height={36} className="object-contain" unoptimized />
              ) : (
                <ShoppingBag size={14} className="text-text-muted" />
              )}
            </div>
          )}
          <div className="min-w-0 flex-1">
            {pickedBag ? (
              <>
                {/* Title row replaced with brand+model. Slot name is dropped
                 *  here — bag's own name is the strongest identifier and the
                 *  positional context is implicit via the panel order. */}
                <div className="flex items-center gap-1.5">
                  <p className="text-white text-sm font-medium truncate">
                    {pickedBag.brand} <span className="font-normal text-text-secondary">{pickedBag.model}</span>
                  </p>
                  {slot.paired && (
                    <span className="shrink-0 text-[10px] font-semibold text-accent bg-accent/15 rounded px-1.5 py-0.5">
                      ×2
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                  <p className="text-text-muted text-[11px] truncate">
                    {pickedBag.weightGrams ? `${pickedBag.weightGrams}g` : ''}
                    {pickedBag.weightGrams && pickedBag.priceEur ? ' · ' : ''}
                    {pickedBag.priceEur ? `~€${pickedBag.priceEur}` : ''}
                  </p>
                  {buyUrl && (
                    <a
                      href={buyUrl}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      title={t('buy_on_amazon')}
                      className="shrink-0 p-0.5 rounded text-text-muted hover:text-accent transition-colors"
                    >
                      <ExternalLink size={11} />
                    </a>
                  )}
                  <button
                    onClick={onUnpick}
                    title={t('unpick')}
                    aria-label={t('unpick')}
                    className="shrink-0 p-0.5 rounded text-text-muted hover:text-danger transition-colors"
                  >
                    <XIcon size={11} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <p className="text-white text-sm font-medium truncate">{name}</p>
                  {slot.paired && (
                    <span className="shrink-0 text-[10px] font-semibold text-accent bg-accent/15 rounded px-1.5 py-0.5">
                      ×2
                    </span>
                  )}
                </div>
                <p className="text-text-muted text-xs mt-0.5">
                  {slot.typicalRangeL[0]}–{slot.typicalRangeL[1]}L {t('typical')}
                  {slot.paired && ` · ${t('per_bag_hint')}`}
                </p>
              </>
            )}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-1">
          <input
            type="number"
            min={0}
            max={50}
            step={0.5}
            value={slot.capacityPerBagL}
            onChange={e => onCapacityChange(parseFloat(e.target.value) || 0)}
            disabled={!slot.active || !!pickedBag}
            className="w-16 bg-[#252340] border border-white/[0.07] rounded-md px-2 py-1 text-white text-sm text-right focus:outline-none focus:border-accent/60 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={`${name} capacity in litres`}
            title={pickedBag ? t('capacity_locked') : undefined}
          />
          <span className="text-text-muted text-xs">L</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${slot.active ? slot.fillPercent : 0}%`, backgroundColor: fillColor }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        {slot.active ? (
          <p className="text-text-muted text-xs">
            {slot.assignedL.toFixed(1)} / {slot.capacityL.toFixed(1)}L · {slot.fillPercent}%
            {slot.paired && ` (${slot.capacityPerBagL.toFixed(1)}L ${t('per_bag')})`}
          </p>
        ) : (
          <p className="text-text-muted text-xs italic">{t('inactive')}</p>
        )}
        {slot.overflow && (
          <span className="flex items-center gap-1 text-danger text-xs">
            <AlertTriangle size={12} /> {t('overflow')}
          </span>
        )}
      </div>

      {/* Show "Pick a bag" link only when slot is active AND no bag picked yet.
       *  Picked-bag info already lives inline in the header subtitle row. */}
      {slot.active && !pickedBag && (
        <div className="mt-2.5">
          <button
            onClick={onPickClick}
            className="text-xs text-accent hover:text-accent-hover font-medium inline-flex items-center gap-1.5"
          >
            <ShoppingBag size={12} /> {t('pick_a_bag')}
          </button>
        </div>
      )}
    </div>
  );
}

export function BagRecommendationPanel({
  recommendation,
  mode,
  onModeChange,
  onCapacityChange,
  onActiveChange,
  picks,
  onPickClick,
  onUnpick,
}: Props) {
  const t = useTranslations('bags');
  const gear = recommendation.total;
  const capacity = recommendation.totalCapacity;
  const overCapacity = mode === 'cumulative' && gear > capacity;
  const usagePercent = capacity > 0 ? Math.min(Math.round((gear / capacity) * 100), 100) : 0;
  const remaining = Math.max(capacity - gear, 0);
  const summaryColor =
    capacity === 0 ? '#3a3650' :
    overCapacity ? '#f03d3d' :
    usagePercent >= 90 ? '#f0a400' :
    '#6d4aff';

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#1c1a2e] shadow-card overflow-hidden h-fit">
      <div className="px-5 py-4 border-b border-white/[0.07]">
        <h2 className="text-white font-medium text-sm">{t('title')}</h2>
        <p className="text-text-muted text-xs mt-0.5">{t('subtitle')}</p>
      </div>

      {/* Summary stat — gear vs capacity, big numbers + progress bar */}
      <div className="px-5 py-4 border-b border-white/[0.07] bg-gradient-to-br from-accent/[0.06] to-transparent">
        <div className="flex items-end justify-between gap-4 mb-3">
          <div className="min-w-0">
            <p className="text-text-muted text-[10px] uppercase tracking-wider font-medium">{t('gear_total')}</p>
            <p className="text-white text-2xl font-bold leading-none mt-1">{gear.toFixed(1)}<span className="text-text-secondary text-base ml-0.5">L</span></p>
          </div>
          <div className="text-right min-w-0">
            <p className="text-text-muted text-[10px] uppercase tracking-wider font-medium">{t('total_capacity')}</p>
            <p className="text-white text-2xl font-bold leading-none mt-1">{capacity.toFixed(1)}<span className="text-text-secondary text-base ml-0.5">L</span></p>
          </div>
        </div>

        <div className="h-2 rounded-full bg-white/[0.07] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${usagePercent}%`, backgroundColor: summaryColor }}
          />
        </div>

        <div className="flex items-center justify-between mt-2 text-xs">
          {overCapacity ? (
            <span className="flex items-center gap-1 text-danger font-medium">
              <AlertTriangle size={12} />
              {t('overflow_by', { liters: (gear - capacity).toFixed(1) })}
            </span>
          ) : capacity > 0 ? (
            <span className="text-text-secondary">
              {t('remaining', { liters: remaining.toFixed(1) })}
            </span>
          ) : (
            <span className="text-text-muted italic">{t('no_active_bags')}</span>
          )}
          {capacity > 0 && (
            <span className="text-text-muted font-medium">{usagePercent}%</span>
          )}
        </div>
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
        {(['handlebar', 'frame', 'seatpack', 'fork', 'panniers'] as const).map(key => (
          <SlotCard
            key={key}
            slot={recommendation[key]}
            pickedBag={picks[key] ?? undefined}
            onCapacityChange={v => onCapacityChange(key, v)}
            onActiveToggle={v => onActiveChange(key, v)}
            onPickClick={() => onPickClick(key)}
            onUnpick={() => onUnpick(key)}
          />
        ))}
      </div>

    </div>
  );
}
