'use client';

import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import { X, ShoppingBag, ExternalLink } from 'lucide-react';
import { trackedOutboundUrl } from '@/presentation/utils/safeUrl';
import type { BagProduct } from '@/domain/gear/BagProduct';
import type { BagSlotKey } from '@/domain/gear/BagRecommendation';

interface Props {
  slot: BagSlotKey;
  slotName: string;
  bags: BagProduct[];
  onPick: (bag: BagProduct) => void;
  onClose: () => void;
}

const SLOT_TITLE_KEY: Record<BagSlotKey, string> = {
  handlebar: 'picker_handlebar',
  frame:     'picker_frame',
  seatpack:  'picker_seatpack',
  fork:      'picker_fork',
  panniers:  'picker_panniers',
};

export function BagPickerModal({ slot, slotName, bags, onPick, onClose }: Props) {
  const t = useTranslations('bags');
  const locale = useLocale();

  // Filter and sort once per render — the bag list is small (~5–10 per slot).
  const candidates = bags
    .filter(b => b.slot === slot)
    .sort((a, b) => a.capacityPerBagL - b.capacityPerBagL);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#1c1a2e] border border-white/[0.07] rounded-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col shadow-card animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-white/[0.07] shrink-0">
          <div>
            <h2 className="text-white font-semibold text-lg">{t(SLOT_TITLE_KEY[slot])}</h2>
            <p className="text-text-muted text-xs mt-0.5">{t('picker_subtitle')}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-text-muted hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {candidates.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">{t('picker_empty')}</p>
          ) : candidates.map(bag => (
            <BagRow key={bag.id} bag={bag} onPick={() => onPick(bag)} locale={locale} />
          ))}
        </div>

        <div className="px-5 py-3 border-t border-white/[0.07] bg-white/[0.02] text-text-muted text-[11px] text-center shrink-0">
          {t('picker_footnote', { slotName })}
        </div>
      </div>
    </div>
  );
}

function BagRow({ bag, onPick, locale }: { bag: BagProduct; onPick: () => void; locale: string }) {
  const t = useTranslations('bags');
  const effective = bag.paired ? bag.capacityPerBagL * 2 : bag.capacityPerBagL;
  const buyUrl = locale === 'de'
    ? trackedOutboundUrl(bag.sourceUrl, bag.id, `${bag.brand} ${bag.model}`, bag.amazonAsin)
    : undefined;

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] hover:border-accent/40 hover:bg-accent/[0.04] transition-colors p-3 flex items-center gap-3">
      <button onClick={onPick} className="contents text-left" aria-label={`Pick ${bag.brand} ${bag.model}`}>
        <div className="shrink-0 w-12 h-12 rounded-lg bg-white/[0.05] flex items-center justify-center overflow-hidden">
          {bag.imageUrl ? (
            <Image
              src={bag.imageUrl}
              alt={`${bag.brand} ${bag.model}`}
              width={48}
              height={48}
              className="object-contain"
              unoptimized
            />
          ) : (
            <ShoppingBag size={20} className="text-text-muted" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">
            {bag.brand} <span className="text-text-secondary font-normal">{bag.model}</span>
          </p>
          <p className="text-text-muted text-xs mt-0.5">
            {bag.capacityPerBagL}L
            {bag.paired && <> · {t('per_bag')} (×2 = {effective}L)</>}
            {bag.weightGrams && <> · {bag.weightGrams}g</>}
            {bag.priceEur && <> · ~€{bag.priceEur}</>}
          </p>
        </div>
      </button>
      {buyUrl && (
        <a
          href={buyUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={e => e.stopPropagation()}
          title={t('buy_on_amazon')}
          className="shrink-0 p-2 rounded-lg text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
        >
          <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}
