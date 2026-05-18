'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Sparkles, Database, Layers, AlertTriangle } from 'lucide-react';
import { categoryIcon } from '@/domain/gear/GearCategoryIcon';
import { CATEGORY_LABELS } from '@/domain/gear/GearCategory';
import { GEAR_PRESETS } from '@/domain/gear/GearPreset';
import {
  computeBagRecommendation,
  DEFAULT_BAG_CAPACITIES,
  DEFAULT_BAG_ACTIVE,
  type BagCapacities,
  type BagActive,
  type BagDistributionMode,
  type BagSlot,
} from '@/domain/gear/BagRecommendation';

interface SharedListItem {
  id: string;
  name: string;
  category: string;
  volumeLiters: number;
  weightGrams?: number;
  quantity: number;
  sizeLabel?: string;
  source?: 'db' | 'ai' | 'preset' | 'manual';
  sourceUrl?: string;
  active: boolean;
}

interface SharedBagSetup {
  capacities: BagCapacities;
  active: BagActive;
  mode: BagDistributionMode;
}

interface Props {
  data: {
    name: string;
    sharedAt: string;
    bagSetup: SharedBagSetup | null;
    items: SharedListItem[];
  };
}

const SOURCE_ICON: Record<string, React.ReactElement> = {
  db:     <Database size={11} className="text-success shrink-0" />,
  ai:     <Sparkles size={11} className="text-accent shrink-0" />,
  preset: <Layers size={11} className="text-text-muted shrink-0" />,
};

function fmtWeight(g?: number) {
  if (!g) return null;
  return g >= 1000 ? `${(g / 1000).toFixed(2).replace(/\.?0+$/, '')}kg` : `${Math.round(g)}g`;
}

export function SharedListView({ data }: Props) {
  const t = useTranslations();
  const locale = useLocale();

  const totalVolume = data.items.reduce((s, e) => (e.active === false ? s : s + e.volumeLiters * e.quantity), 0);
  const totalWeight = data.items.reduce((s, e) => (e.active === false ? s : s + (e.weightGrams ?? 0) * e.quantity), 0);

  const capacities = data.bagSetup?.capacities ?? DEFAULT_BAG_CAPACITIES;
  const active = data.bagSetup?.active ?? DEFAULT_BAG_ACTIVE;
  const mode = data.bagSetup?.mode ?? 'cumulative';
  const bagRec = totalVolume > 0 ? computeBagRecommendation(totalVolume, capacities, active, mode) : null;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-text-muted text-xs uppercase tracking-wider mb-2">{t('share.shared_gear_list')}</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1">{data.name}</h1>
        <p className="text-text-muted text-sm">
          {t('share.shared_on', { date: new Date(data.sharedAt).toLocaleDateString(locale) })}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.07] bg-[#1c1a2e] shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.07]">
            <h2 className="text-white font-medium text-sm">{t('list.title')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[460px]">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  <th className="px-5 py-2.5 text-left text-text-muted font-normal text-xs">{t('list.item_col')}</th>
                  <th className="px-3 py-2.5 text-center text-text-muted font-normal text-xs">{t('list.qty_col')}</th>
                  <th className="px-3 py-2.5 text-right text-text-muted font-normal text-xs">{t('list.weight_col')}</th>
                  <th className="px-3 py-2.5 text-right text-text-muted font-normal text-xs">{t('list.volume_col')}</th>
                  <th className="px-4 py-2.5 text-right text-text-muted font-normal text-xs">{t('list.total_col')}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((entry, i) => {
                  const isActive = entry.active !== false;
                  const lineVol = entry.volumeLiters * entry.quantity;
                  const catLabels = CATEGORY_LABELS[entry.category as keyof typeof CATEGORY_LABELS];
                  const catLabel = catLabels ? (catLabels[locale] ?? catLabels['en']) : entry.category;
                  // Preset names: resolve from the canonical preset definition
                  // so the shared view shows the viewer's locale, not the sharer's.
                  // Match by (category, volumeLiters) because entry.id is a fresh
                  // Postgres uuid after the save round-trip, not the original preset id.
                  const preset = entry.source === 'preset'
                    ? GEAR_PRESETS.find(p =>
                        p.id === entry.id ||
                        (p.category === entry.category && Math.abs(p.volumeLiters - entry.volumeLiters) < 0.01),
                      )
                    : undefined;
                  const displayName = preset ? (preset.names[locale] ?? preset.names['en']) : entry.name;
                  return (
                    <tr
                      key={entry.id}
                      className={`border-b border-white/[0.04] ${i === data.items.length - 1 ? 'border-b-0' : ''} ${isActive ? '' : 'opacity-50'}`}
                    >
                      <td className="px-5 py-3">
                        <p className="text-text-muted text-xs leading-none mb-1">
                          {categoryIcon(entry.category)} {catLabel}
                          {entry.sizeLabel && <span className="ml-1.5 text-accent/70">· {entry.sizeLabel}</span>}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span className={isActive ? 'text-white' : 'text-text-secondary line-through'}>{displayName}</span>
                          {entry.source && SOURCE_ICON[entry.source]}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center text-text-secondary">×{entry.quantity}</td>
                      <td className="px-3 py-3 text-right text-text-secondary text-xs">
                        {fmtWeight(entry.weightGrams) ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-right text-text-secondary">
                        {entry.volumeLiters.toFixed(1)}L
                      </td>
                      <td className="px-4 py-3 text-right text-white font-medium">
                        {lineVol.toFixed(1)}L
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-white/[0.07] px-5 py-4 flex items-center justify-between bg-white/[0.02]">
            <p className="text-text-secondary text-sm font-medium">{t('list.total_label')}</p>
            <div className="flex items-baseline gap-4">
              {totalWeight > 0 && <span className="text-text-muted text-sm">{fmtWeight(totalWeight)}</span>}
              <span className="text-2xl font-bold text-white">
                {totalVolume.toFixed(1)}<span className="text-text-muted text-base font-normal ml-0.5">L</span>
              </span>
            </div>
          </div>
        </div>

        {/* Bag summary (read-only) */}
        {bagRec && (
          <div className="rounded-2xl border border-white/[0.07] bg-[#1c1a2e] shadow-card overflow-hidden h-fit">
            <div className="px-5 py-4 border-b border-white/[0.07]">
              <h2 className="text-white font-medium text-sm">{t('bags.title')}</h2>
            </div>
            <ReadOnlyBagSummary rec={bagRec} />
            <div className="p-4 space-y-2">
              {(['handlebar', 'frame', 'seatpack', 'fork', 'panniers'] as const).map(k => {
                const slot = bagRec[k];
                if (!slot.active) return null;
                return <ReadOnlySlot key={k} slot={slot} locale={locale} />;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReadOnlyBagSummary({ rec }: { rec: ReturnType<typeof computeBagRecommendation> }) {
  const t = useTranslations('bags');
  const usagePercent = rec.totalCapacity > 0 ? Math.min(Math.round((rec.total / rec.totalCapacity) * 100), 100) : 0;
  const overCapacity = rec.mode === 'cumulative' && rec.total > rec.totalCapacity;
  const color = rec.totalCapacity === 0 ? '#3a3650' : overCapacity ? '#f03d3d' : usagePercent >= 90 ? '#f0a400' : '#6d4aff';

  return (
    <div className="px-5 py-4 border-b border-white/[0.07] bg-gradient-to-br from-accent/[0.06] to-transparent">
      <div className="flex items-end justify-between gap-4 mb-3">
        <div>
          <p className="text-text-muted text-[10px] uppercase tracking-wider font-medium">{t('gear_total')}</p>
          <p className="text-white text-2xl font-bold leading-none mt-1">{rec.total.toFixed(1)}<span className="text-text-secondary text-base ml-0.5">L</span></p>
        </div>
        <div className="text-right">
          <p className="text-text-muted text-[10px] uppercase tracking-wider font-medium">{t('total_capacity')}</p>
          <p className="text-white text-2xl font-bold leading-none mt-1">{rec.totalCapacity.toFixed(1)}<span className="text-text-secondary text-base ml-0.5">L</span></p>
        </div>
      </div>
      <div className="h-2 rounded-full bg-white/[0.07] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${usagePercent}%`, backgroundColor: color }} />
      </div>
      <div className="flex items-center justify-between mt-2 text-xs">
        {overCapacity ? (
          <span className="flex items-center gap-1 text-danger font-medium">
            <AlertTriangle size={12} /> {t('overflow_by', { liters: (rec.total - rec.totalCapacity).toFixed(1) })}
          </span>
        ) : (
          <span className="text-text-secondary" />
        )}
        {rec.totalCapacity > 0 && <span className="text-text-muted font-medium">{usagePercent}%</span>}
      </div>
    </div>
  );
}

function ReadOnlySlot({ slot, locale }: { slot: BagSlot; locale: string }) {
  const t = useTranslations('bags');
  const name = slot.name[locale] ?? slot.name['en'];
  const fillColor = slot.overflow ? '#f03d3d' : slot.fillPercent >= 90 ? '#f0a400' : '#6d4aff';

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-white text-sm font-medium truncate flex items-center gap-1.5">
          {name}
          {slot.paired && <span className="text-[10px] font-semibold text-accent bg-accent/15 rounded px-1.5 py-0.5">×2</span>}
        </p>
        <span className="text-text-secondary text-xs">
          {slot.assignedL.toFixed(1)} / {slot.capacityL.toFixed(1)}L
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${slot.fillPercent}%`, backgroundColor: fillColor }} />
      </div>
      {slot.overflow && (
        <p className="text-danger text-xs mt-1 flex items-center gap-1">
          <AlertTriangle size={10} /> {t('overflow')}
        </p>
      )}
    </div>
  );
}
