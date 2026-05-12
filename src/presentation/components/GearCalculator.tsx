'use client';

import { useState, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { v4 as uuidv4 } from 'uuid';
import { Bike } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { PresetPanel } from './PresetPanel';
import { GearList } from './GearList';
import { BagRecommendationPanel } from './BagRecommendationPanel';
import { LanguageSwitcher } from './LanguageSwitcher';
import { computeBagRecommendation } from '@/domain/gear/BagRecommendation';
import type { GearPreset } from '@/domain/gear/GearPreset';

export interface GearEntry {
  id: string;
  name: string;
  volumeLiters: number;
  weightGrams?: number;
  category: string;
  quantity: number;
  source: 'db' | 'ai' | 'preset';
  confidence?: string;
  sourceUrl?: string;
}

export function GearCalculator() {
  const t = useTranslations();
  const locale = useLocale();
  const [entries, setEntries] = useState<GearEntry[]>([]);

  const addEntry = useCallback((entry: GearEntry) => {
    setEntries(prev => [...prev, entry]);
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, quantity: Math.max(1, quantity) } : e));
  }, []);

  const addPreset = useCallback((preset: GearPreset) => {
    const name = preset.names[locale] ?? preset.names['en'];
    setEntries(prev => {
      const exists = prev.find(e => e.id === preset.id);
      if (exists) return prev.filter(e => e.id !== preset.id);
      return [...prev, {
        id: preset.id,
        name,
        volumeLiters: preset.volumeLiters,
        category: preset.category,
        quantity: 1,
        source: 'preset',
      }];
    });
  }, [locale]);

  const isPresetActive = useCallback((id: string) => entries.some(e => e.id === id), [entries]);

  const totalVolume = entries.reduce((sum, e) => sum + e.volumeLiters * e.quantity, 0);
  const bagRec = totalVolume > 0 ? computeBagRecommendation(totalVolume) : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#13111c' }}>
      {/* Header */}
      <header className="border-b border-white/[0.07] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Bike size={16} className="text-white" />
            </div>
            <span className="font-semibold text-white tracking-tight">Veloadout</span>
            <span className="hidden sm:block text-text-secondary text-sm">— {t('nav.tagline')}</span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 pt-14 pb-10 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
          {t('hero.title')}
        </h1>
        <p className="text-text-secondary text-lg max-w-xl mx-auto">
          {t('hero.subtitle')}
        </p>
      </section>

      {/* Main */}
      <main className="flex-1 px-4 sm:px-6 pb-16">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Search */}
          <SearchBar onAdd={addEntry} />

          {/* Presets */}
          <PresetPanel onToggle={addPreset} isActive={isPresetActive} />

          {/* Results grid */}
          {entries.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <GearList
                  entries={entries}
                  onRemove={removeEntry}
                  onQuantityChange={updateQuantity}
                  totalVolume={totalVolume}
                />
              </div>
              {bagRec && (
                <div>
                  <BagRecommendationPanel recommendation={bagRec} />
                </div>
              )}
            </div>
          )}

          {entries.length === 0 && (
            <p className="text-center text-text-muted py-8">{t('list.empty')}</p>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.07] px-6 py-5 text-center">
        <p className="text-text-muted text-sm">{t('footer.text')}</p>
      </footer>
    </div>
  );
}
