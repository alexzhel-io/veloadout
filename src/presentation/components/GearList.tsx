'use client';

import { useTranslations } from 'next-intl';
import { X, Sparkles, Database, Layers } from 'lucide-react';
import type { GearEntry } from './GearCalculator';

interface Props {
  entries: GearEntry[];
  onRemove: (id: string) => void;
  onQuantityChange: (id: string, qty: number) => void;
  totalVolume: number;
}

const SOURCE_ICON = {
  db:     <Database size={11} className="text-success" />,
  ai:     <Sparkles size={11} className="text-accent" />,
  preset: <Layers size={11} className="text-text-muted" />,
};

export function GearList({ entries, onRemove, onQuantityChange, totalVolume }: Props) {
  const t = useTranslations('list');

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#1c1a2e] shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.07]">
        <h2 className="text-white font-medium text-sm">{t('title')}</h2>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.05]">
            <th className="px-5 py-2.5 text-left text-text-muted font-normal text-xs">{t('item_col')}</th>
            <th className="px-3 py-2.5 text-center text-text-muted font-normal text-xs">{t('qty_col')}</th>
            <th className="px-3 py-2.5 text-right text-text-muted font-normal text-xs">{t('volume_col')}</th>
            <th className="px-4 py-2.5 text-right text-text-muted font-normal text-xs">{t('total_col')}</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => {
            const lineVol = entry.volumeLiters * entry.quantity;
            return (
              <tr
                key={entry.id}
                className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors animate-slide-up ${i === entries.length - 1 ? 'border-b-0' : ''}`}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-white">{entry.name}</span>
                    {SOURCE_ICON[entry.source]}
                  </div>
                  {entry.confidence === 'low' && (
                    <p className="text-xs text-warning mt-0.5">⚠ low confidence</p>
                  )}
                </td>
                <td className="px-3 py-3 text-center">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={entry.quantity}
                    onChange={e => onQuantityChange(entry.id, parseInt(e.target.value) || 1)}
                    className="w-12 bg-[#252340] border border-white/[0.07] rounded-lg text-center text-white text-sm py-1 focus:outline-none focus:border-accent/60"
                  />
                </td>
                <td className="px-3 py-3 text-right text-text-secondary">
                  {entry.volumeLiters.toFixed(1)}L
                </td>
                <td className="px-4 py-3 text-right text-white font-medium">
                  {lineVol.toFixed(1)}L
                </td>
                <td className="pr-3 py-3 text-right">
                  <button
                    onClick={() => onRemove(entry.id)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Total row */}
      <div className="border-t border-white/[0.07] px-5 py-4 flex items-center justify-between bg-white/[0.02]">
        <span className="text-text-secondary text-sm font-medium">{t('total_label')}</span>
        <span className="text-2xl font-bold text-white">
          {totalVolume.toFixed(1)}<span className="text-text-muted text-base font-normal ml-1">L</span>
        </span>
      </div>
    </div>
  );
}
