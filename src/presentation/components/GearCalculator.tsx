'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { v4 as uuidv4 } from 'uuid';
import { Bike, Save, CheckCircle, Loader2 } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { PresetPanel } from './PresetPanel';
import { GearList } from './GearList';
import { BagRecommendationPanel } from './BagRecommendationPanel';
import { LanguageSwitcher } from './LanguageSwitcher';
import { AuthButton } from './AuthButton';
import { WelcomeHint } from './WelcomeHint';
import { useToast } from './Toast';
import { computeBagRecommendation, DEFAULT_BAG_CAPACITIES, type BagCapacities, type BagDistributionMode } from '@/domain/gear/BagRecommendation';
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
  sizeLabel?: string;
}

interface Props {
  user: { id: string; email?: string } | null;
}

export function GearCalculator({ user }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const toast = useToast();
  const [entries, setEntries] = useState<GearEntry[]>([]);
  const [listId, setListId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveAbort = useRef<AbortController | null>(null);
  const initialized = useRef(false);
  // Keep a ref to the latest saveList so the unmount-flush effect (which runs
  // with []-deps) calls the freshest version, not the one captured at mount.
  const saveListRef = useRef<() => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch('/api/lists')
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(({ list }) => {
        if (cancelled || !list) return;
        setListId(list.id);
        // Merge by id rather than clobbering. If the user already added entries
        // while the fetch was in flight, keep them — the next auto-save will
        // push them. Otherwise apply the fetched list as-is.
        setEntries(current => {
          if (current.length === 0) {
            return (list.items ?? []).map((item: { id?: string; name: string; volumeLiters: number; weightGrams?: number; category: string; quantity: number; sizeLabel?: string; source: GearEntry['source']; sourceUrl?: string }) => ({
              id: item.id ?? uuidv4(),
              name: item.name,
              volumeLiters: item.volumeLiters,
              weightGrams: item.weightGrams,
              category: item.category,
              quantity: item.quantity,
              sizeLabel: item.sizeLabel,
              source: item.source ?? 'db',
              sourceUrl: item.sourceUrl,
            }));
          }
          return current;
        });
        initialized.current = true;
      })
      .catch(() => { if (!cancelled) toast.show('error', t('errors.load_failed')); });

    return () => { cancelled = true; };
  }, [user, toast, t]);

  const saveList = useCallback(async () => {
    if (!listId) return;
    saveAbort.current?.abort();
    const controller = new AbortController();
    saveAbort.current = controller;
    setSaving(true);
    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId,
          items: entries.map(e => ({
            name: e.name, category: e.category, volumeLiters: e.volumeLiters,
            weightGrams: e.weightGrams, quantity: e.quantity, sizeLabel: e.sizeLabel,
            source: e.source, sourceUrl: e.sourceUrl,
          })),
        }),
        signal: controller.signal,
        keepalive: true, // let the request complete even if the page is unloaded
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast.show('error', t('errors.save_failed'));
      }
    } finally {
      setSaving(false);
    }
  }, [listId, entries, toast, t]);

  // Keep the unmount-flush effect pointed at the freshest saveList
  useEffect(() => { saveListRef.current = saveList; }, [saveList]);

  useEffect(() => {
    if (!user || !listId || !initialized.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void saveList(); }, 2000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [entries, listId, user, saveList]);

  // On unmount: flush any pending save and clear the "Saved" toast timer.
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        void saveListRef.current();
      }
      if (savedTimer.current) {
        clearTimeout(savedTimer.current);
        savedTimer.current = null;
      }
    };
  }, []);

  const addEntry = useCallback((entry: GearEntry) => setEntries(prev => [...prev, entry]), []);
  const removeEntry = useCallback((id: string) => setEntries(prev => prev.filter(e => e.id !== id)), []);
  const updateQuantity = useCallback((id: string, quantity: number) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, quantity: Math.max(1, quantity) } : e));
  }, []);

  const addPreset = useCallback((preset: GearPreset) => {
    const name = preset.names[locale] ?? preset.names['en'];
    setEntries(prev => {
      if (prev.find(e => e.id === preset.id)) return prev.filter(e => e.id !== preset.id);
      return [...prev, { id: preset.id, name, volumeLiters: preset.volumeLiters, category: preset.category, quantity: 1, source: 'preset' }];
    });
  }, [locale]);

  const isPresetActive = useCallback((id: string) => entries.some(e => e.id === id), [entries]);

  const totalVolume = entries.reduce((sum, e) => sum + e.volumeLiters * e.quantity, 0);

  // Bag setup is per-browser (localStorage), not per-user — it reflects the
  // physical bike, not the account.
  const [bagCapacities, setBagCapacities] = useState<BagCapacities>(DEFAULT_BAG_CAPACITIES);
  const [bagMode, setBagMode] = useState<BagDistributionMode>('cumulative');
  const bagSetupLoaded = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('veloadout:bagSetup');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.capacities && typeof parsed.capacities.handlebar === 'number') {
          // Merge with defaults so newly added slots (e.g. fork) get a default
          // value for users who saved a setup before the slot existed.
          setBagCapacities({ ...DEFAULT_BAG_CAPACITIES, ...parsed.capacities });
        }
        if (parsed.mode === 'cumulative' || parsed.mode === 'each') {
          setBagMode(parsed.mode);
        }
      }
    } catch { /* ignore malformed storage */ }
    bagSetupLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!bagSetupLoaded.current) return;
    try {
      localStorage.setItem('veloadout:bagSetup', JSON.stringify({ capacities: bagCapacities, mode: bagMode }));
    } catch { /* localStorage full / unavailable */ }
  }, [bagCapacities, bagMode]);

  const updateBagCapacity = useCallback((key: keyof BagCapacities, value: number) => {
    setBagCapacities(prev => ({ ...prev, [key]: Math.max(0, Math.min(50, value)) }));
  }, []);

  const bagRec = totalVolume > 0 ? computeBagRecommendation(totalVolume, bagCapacities, bagMode) : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#13111c' }}>
      <header className="border-b border-white/[0.07] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Bike size={16} className="text-white" />
            </div>
            <span className="font-semibold text-white tracking-tight">Veloadout</span>
            <span className="hidden sm:block text-text-secondary text-sm">— {t('nav.tagline')}</span>
          </div>
          <div className="flex items-center gap-3">
            {user && entries.length > 0 && (
              <button
                onClick={saveList}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.07] text-text-secondary hover:text-white hover:border-white/20 text-xs transition-colors"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <CheckCircle size={12} className="text-success" /> : <Save size={12} />}
                {saved ? t('auth.list_saved') : t('auth.save_list')}
              </button>
            )}
            {!user && entries.length > 0 && (
              <span className="text-text-muted text-xs hidden sm:block">{t('auth.sign_in_to_save')}</span>
            )}
            <LanguageSwitcher />
            <AuthButton user={user} />
          </div>
        </div>
      </header>

      <section className="px-6 pt-14 pb-10 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
          {t('hero.title')}
        </h1>
        <p className="text-text-secondary text-lg max-w-xl mx-auto">
          {t('hero.subtitle')}
        </p>
      </section>

      <main className="flex-1 px-4 sm:px-6 pb-16">
        <div className="max-w-6xl mx-auto space-y-6">
          <WelcomeHint />
          <SearchBar onAdd={addEntry} />
          <PresetPanel onToggle={addPreset} isActive={isPresetActive} />

          {entries.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <GearList entries={entries} onRemove={removeEntry} onQuantityChange={updateQuantity} totalVolume={totalVolume} />
              </div>
              {bagRec && (
                <div>
                  <BagRecommendationPanel
                    recommendation={bagRec}
                    mode={bagMode}
                    onModeChange={setBagMode}
                    capacities={bagCapacities}
                    onCapacityChange={updateBagCapacity}
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-text-muted py-8">{t('list.empty')}</p>
          )}
        </div>
      </main>

      <footer className="border-t border-white/[0.07] px-6 py-5 text-center text-text-muted text-sm space-y-1">
        <p>{t('footer.text')}</p>
        <p className="space-x-3">
          <a href={`/${locale}/help`} className="hover:text-white transition-colors">{t('footer.help')}</a>
          <span>·</span>
          <a href={`/${locale}/privacy`} className="hover:text-white transition-colors">{t('footer.privacy')}</a>
          <span>·</span>
          <a href={`/${locale}/terms`} className="hover:text-white transition-colors">{t('footer.terms')}</a>
          <span>·</span>
          <a href={`/${locale}/impressum`} className="hover:text-white transition-colors">Impressum</a>
        </p>
      </footer>
    </div>
  );
}
