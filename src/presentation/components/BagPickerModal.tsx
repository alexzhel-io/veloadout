'use client';

import { useMemo } from 'react';
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

/**
 * Strip trailing volume marker from a model name so variants of the same
 * model (e.g. 'Seat-Pack 11L' and 'Seat-Pack 16.5L') share a family key.
 * The remaining string is the "family name" we display once with capacity
 * chips for the variants.
 */
function familyName(model: string): string {
  return model
    .replace(/\s*\d+(?:\.\d+)?\s*L\b\s*$/i, '')
    .replace(/\s*\(.*?\)\s*$/, '')
    .trim();
}

interface BagFamily {
  brand: string;
  family: string;
  variants: BagProduct[];
}

function groupByFamily(bags: BagProduct[]): BagFamily[] {
  const byKey = new Map<string, BagFamily>();
  for (const bag of bags) {
    const fam = familyName(bag.model);
    const key = `${bag.brand}::${fam}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.variants.push(bag);
    } else {
      byKey.set(key, { brand: bag.brand, family: fam, variants: [bag] });
    }
  }
  // Sort variants inside a family by capacity asc; sort families by min capacity.
  for (const f of byKey.values()) {
    f.variants.sort((a, b) => a.capacityPerBagL - b.capacityPerBagL);
  }
  return Array.from(byKey.values())
    .sort((a, b) => a.variants[0].capacityPerBagL - b.variants[0].capacityPerBagL);
}

export function BagPickerModal({ slot, slotName, bags, onPick, onClose }: Props) {
  const t = useTranslations('bags');
  const locale = useLocale();

  const families = useMemo(
    () => groupByFamily(bags.filter(b => b.slot === slot)),
    [bags, slot],
  );

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
          {families.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">{t('picker_empty')}</p>
          ) : families.map(fam => (
            <FamilyRow key={`${fam.brand}::${fam.family}`} family={fam} onPick={onPick} locale={locale} />
          ))}
        </div>

        <div className="px-5 py-3 border-t border-white/[0.07] bg-white/[0.02] text-text-muted text-[11px] text-center shrink-0">
          {t('picker_footnote', { slotName })}
        </div>
      </div>
    </div>
  );
}

function FamilyRow({ family, onPick, locale }: { family: BagFamily; onPick: (bag: BagProduct) => void; locale: string }) {
  const t = useTranslations('bags');
  // Take image / price from the first variant — they're usually shared
  // across sizes of the same model.
  const sample = family.variants[0];
  const buyUrl = locale === 'de'
    ? trackedOutboundUrl(sample.sourceUrl, sample.id, `${sample.brand} ${family.family}`, sample.amazonAsin)
    : undefined;

  // Range info — show "from XL" or "11L–16.5L" depending on variant count
  const minCap = family.variants[0].capacityPerBagL;
  const maxCap = family.variants[family.variants.length - 1].capacityPerBagL;
  const capRange = family.variants.length === 1
    ? `${minCap}L`
    : `${minCap}L–${maxCap}L`;
  const minWeight = family.variants.find(v => v.weightGrams)?.weightGrams;
  const minPrice  = family.variants.find(v => v.priceEur)?.priceEur;

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] hover:border-accent/40 transition-colors p-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-12 h-12 rounded-lg bg-white/[0.05] flex items-center justify-center overflow-hidden">
          {sample.imageUrl ? (
            <Image
              src={sample.imageUrl}
              alt={`${sample.brand} ${family.family}`}
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
            {family.brand} <span className="text-text-secondary font-normal">{family.family}</span>
          </p>
          <p className="text-text-muted text-xs mt-0.5">
            {capRange}
            {sample.paired && ` · ${t('per_bag')}`}
            {minWeight && ` · ${minWeight}g+`}
            {minPrice && ` · ~€${minPrice}+`}
          </p>
        </div>
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

      {/* Capacity chips — one per variant. Click picks that bag. */}
      <div className="flex flex-wrap gap-1.5 mt-2.5 ml-[60px]">
        {family.variants.map(variant => (
          <button
            key={variant.id}
            onClick={() => onPick(variant)}
            className="px-2.5 py-1 rounded-md bg-accent/10 hover:bg-accent/25 text-accent text-xs font-medium transition-colors"
            title={variant.model}
          >
            {variant.capacityPerBagL}L
          </button>
        ))}
      </div>
    </div>
  );
}
