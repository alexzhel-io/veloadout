'use client';

import { useLocale, useTranslations } from 'next-intl';
import { X, Sparkles, Database, Layers, ShoppingCart } from 'lucide-react';
import { categoryIcon } from '@/domain/gear/GearCategoryIcon';
import { CATEGORY_LABELS } from '@/domain/gear/GearCategory';
import { GEAR_PRESETS } from '@/domain/gear/GearPreset';
import { trackedOutboundUrl } from '@/presentation/utils/safeUrl';
import type { GearEntry } from './GearCalculator';

/**
 * For preset-sourced entries, resolve the display name from the preset
 * definition (so locale switches re-render).
 *
 * Tricky bit: after a save round-trip, entry.id is a fresh Postgres uuid
 * (gear_list_items.id), not the original preset.id. So we match by a
 * pair that survives round-trip — (category, volumeLiters) — which is
 * unique across our 14 presets. The id check is kept for unsaved local
 * entries within the same session.
 */
function findPreset(entry: GearEntry) {
  if (entry.source !== 'preset') return undefined;
  return GEAR_PRESETS.find(p =>
    p.id === entry.id ||
    (p.category === entry.category && Math.abs(p.volumeLiters - entry.volumeLiters) < 0.01),
  );
}

function entryNames(entry: GearEntry, locale: string): { display: string; english: string } {
  const preset = findPreset(entry);
  if (preset) {
    return {
      display: preset.names[locale] ?? preset.names['en'],
      english: preset.names['en'],
    };
  }
  return { display: entry.name, english: entry.name };
}

interface Props {
  entries: GearEntry[];
  onRemove: (id: string) => void;
  onQuantityChange: (id: string, qty: number) => void;
  onActiveChange: (id: string, active: boolean) => void;
  totalVolume: number;
}

const SOURCE_ICON = {
  db:     <Database size={11} className="text-success shrink-0" />,
  ai:     <Sparkles size={11} className="text-accent shrink-0" />,
  preset: <Layers size={11} className="text-text-muted shrink-0" />,
};

function fmt(g?: number) {
  if (!g) return null;
  return g >= 1000 ? `${(g / 1000).toFixed(2).replace(/\.?0+$/, '')}kg` : `${Math.round(g)}g`;
}

export function GearList({ entries, onRemove, onQuantityChange, onActiveChange, totalVolume }: Props) {
  const t = useTranslations('list');
  const locale = useLocale();

  const totalWeight = entries.reduce(
    (s, e) => (e.active === false ? s : s + (e.weightGrams ?? 0) * e.quantity),
    0,
  );
  const activeCount = entries.filter(e => e.active !== false).length;
  const inactiveCount = entries.length - activeCount;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#1c1a2e] shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.07] flex items-center justify-between">
        <h2 className="text-white font-medium text-sm">{t('title')}</h2>
        {inactiveCount > 0 && (
          <p className="text-text-muted text-xs">{t('inactive_count', { count: inactiveCount })}</p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b border-white/[0.05]">
              <th className="w-8 px-3 py-2.5"></th>
              <th className="px-3 py-2.5 text-left text-text-muted font-normal text-xs">{t('item_col')}</th>
              <th className="px-3 py-2.5 text-center text-text-muted font-normal text-xs">{t('qty_col')}</th>
              <th className="px-3 py-2.5 text-right text-text-muted font-normal text-xs">{t('weight_col')}</th>
              <th className="px-3 py-2.5 text-right text-text-muted font-normal text-xs">{t('volume_col')}</th>
              <th className="px-4 py-2.5 text-right text-text-muted font-normal text-xs">{t('total_col')}</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => {
              const isActive = entry.active !== false;
              const lineVol = entry.volumeLiters * entry.quantity;
              const catLabels = CATEGORY_LABELS[entry.category as keyof typeof CATEGORY_LABELS];
              const catLabel = catLabels ? (catLabels[locale] ?? catLabels['en']) : entry.category;
              const { display: displayName, english: englishName } = entryNames(entry, locale);
              return (
                <tr
                  key={entry.id}
                  className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors animate-slide-up ${
                    i === entries.length - 1 ? 'border-b-0' : ''
                  } ${isActive ? '' : 'opacity-50'}`}
                >
                  <td className="px-3 py-3 align-top">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={e => onActiveChange(entry.id, e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-white/20 bg-[#252340] text-accent focus:ring-accent/40 cursor-pointer accent-accent"
                      aria-label={isActive ? `Exclude ${entry.name} from totals` : `Include ${entry.name} in totals`}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div>
                      <p className="text-text-muted text-xs leading-none mb-1">
                        {categoryIcon(entry.category)} {catLabel}
                        {entry.sizeLabel && <span className="ml-1.5 text-accent/70">· {entry.sizeLabel}</span>}
                        {' — '}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className={isActive ? 'text-white' : 'text-text-secondary line-through'}>{displayName}</span>
                        {SOURCE_ICON[entry.source]}
                      </div>
                    </div>
                    {entry.confidence === 'low' && (
                      <p className="text-xs text-warning mt-0.5">⚠ low confidence — verify manually</p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <input
                      type="number" min={1} max={20} value={entry.quantity}
                      onChange={e => onQuantityChange(entry.id, parseInt(e.target.value) || 1)}
                      disabled={!isActive}
                      className="w-12 bg-[#252340] border border-white/[0.07] rounded-lg text-center text-white text-sm py-1 focus:outline-none focus:border-accent/60 disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="px-3 py-3 text-right text-text-secondary text-xs">
                    {fmt(entry.weightGrams) ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-right text-text-secondary">
                    {entry.volumeLiters.toFixed(1)}L
                  </td>
                  <td className="px-4 py-3 text-right text-white font-medium">
                    {lineVol.toFixed(1)}L
                  </td>
                  <td className="pr-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      {(() => {
                        // Amazon affiliate links currently route to amazon.de only —
                        // hide on non-DE locales to avoid wasted clicks.
                        if (locale !== 'de') return null;
                        // Always feed Amazon the English name — locale-specific
                        // preset names (e.g. "Спальник") would break the search.
                        const buyUrl = trackedOutboundUrl(entry.sourceUrl, entry.id, englishName);
                        if (!buyUrl) return null;
                        return (
                          <a
                            href={buyUrl}
                            target="_blank"
                            rel="noopener noreferrer sponsored"
                            title={t('buy_hint')}
                            aria-label={`${t('buy_hint')}: ${englishName}`}
                            className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                          >
                            <ShoppingCart size={14} />
                          </a>
                        );
                      })()}
                      <button
                        onClick={() => onRemove(entry.id)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-white/[0.07] px-5 py-4 flex items-center justify-between bg-white/[0.02]">
        <p className="text-text-secondary text-sm font-medium">{t('total_label')}</p>
        <div className="flex items-baseline gap-4">
          {totalWeight > 0 && (
            <span className="text-text-muted text-sm">{fmt(totalWeight)}</span>
          )}
          <span className="text-2xl font-bold text-white">
            {totalVolume.toFixed(1)}<span className="text-text-muted text-base font-normal ml-0.5">L</span>
          </span>
        </div>
      </div>
    </div>
  );
}
