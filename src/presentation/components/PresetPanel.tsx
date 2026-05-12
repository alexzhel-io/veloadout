'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CheckSquare, Square } from 'lucide-react';
import type { GearPreset } from '@/domain/gear/GearPreset';
import { CATEGORY_LABELS } from '@/domain/gear/GearCategory';
import type { GearCategory } from '@/domain/gear/GearCategory';

interface Props {
  onToggle: (preset: GearPreset) => void;
  isActive: (id: string) => boolean;
}

export function PresetPanel({ onToggle, isActive }: Props) {
  const t = useTranslations('presets');
  const tCat = useTranslations('categories');
  const locale = useLocale();
  const [presets, setPresets] = useState<GearPreset[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/presets').then(r => r.json()).then(d => setPresets(d.presets));
  }, []);

  const grouped = presets.reduce<Record<string, GearPreset[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#1c1a2e] shadow-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors"
      >
        <div>
          <p className="text-white font-medium text-sm text-left">{t('title')}</p>
          <p className="text-text-muted text-xs text-left mt-0.5">{t('subtitle')}</p>
        </div>
        <span className="text-text-muted text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-white/[0.07] px-5 py-4 space-y-5 animate-slide-up">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <p className="text-text-muted text-xs uppercase tracking-wider mb-2">
                {tCat(category as keyof typeof tCat)}
              </p>
              <div className="flex flex-wrap gap-2">
                {items.map(preset => {
                  const active = isActive(preset.id);
                  const name = preset.names[locale] ?? preset.names['en'];
                  return (
                    <button
                      key={preset.id}
                      onClick={() => onToggle(preset)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all ${
                        active
                          ? 'border-accent/60 bg-accent/10 text-white'
                          : 'border-white/[0.07] bg-white/[0.03] text-text-secondary hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {active ? <CheckSquare size={13} className="text-accent" /> : <Square size={13} />}
                      {name}
                      <span className="text-text-muted text-xs">{preset.volumeLiters}L</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
