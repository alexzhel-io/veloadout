'use client';

import { useState, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Search, Plus, Loader2, AlertCircle, Sparkles, Database } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { GearEntry } from './GearCalculator';

type SearchState = 'idle' | 'searching_db' | 'searching_ai' | 'not_found';

interface Props {
  onAdd: (entry: GearEntry) => void;
}

export function SearchBar({ onAdd }: Props) {
  const t = useTranslations('search');
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>('idle');
  const [lastSource, setLastSource] = useState<'db' | 'ai' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSearch() {
    const q = query.trim();
    if (!q || state !== 'idle') return;

    setState('searching_db');
    setLastSource(null);

    try {
      const res = await fetch(`/api/lookup?q=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (data.status === 'not_found') {
        setState('searching_ai');

        const res2 = await fetch(`/api/lookup?q=${encodeURIComponent(q)}&force_ai=1`);
        const data2 = await res2.json();

        if (data2.status === 'not_found') {
          setState('not_found');
          setTimeout(() => setState('idle'), 3000);
          return;
        }

        const entry: GearEntry = {
          id: uuidv4(),
          name: data2.item.names[locale] ?? data2.item.names['en'],
          volumeLiters: data2.item.volumeLiters,
          weightGrams: data2.item.weightGrams,
          category: data2.item.category,
          quantity: 1,
          source: 'ai',
          confidence: data2.confidence,
          sourceUrl: data2.item.sourceUrl,
        };
        onAdd(entry);
        setLastSource('ai');
      } else {
        const entry: GearEntry = {
          id: uuidv4(),
          name: data.item.names[locale] ?? data.item.names['en'],
          volumeLiters: data.item.volumeLiters,
          weightGrams: data.item.weightGrams,
          category: data.item.category,
          quantity: 1,
          source: 'db',
        };
        onAdd(entry);
        setLastSource('db');
      }

      setQuery('');
      setState('idle');
      inputRef.current?.focus();
    } catch {
      setState('not_found');
      setTimeout(() => setState('idle'), 3000);
    }
  }

  const isLoading = state === 'searching_db' || state === 'searching_ai';

  const statusText =
    state === 'searching_db' ? t('searching_db') :
    state === 'searching_ai' ? t('searching_ai') :
    state === 'not_found' ? t('not_found') : null;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#1c1a2e] p-5 shadow-card">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={t('placeholder')}
            disabled={isLoading}
            className="w-full bg-[#252340] border border-white/[0.07] rounded-xl pl-10 pr-4 py-3 text-white placeholder-text-muted text-sm focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 transition-all disabled:opacity-50"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={!query.trim() || isLoading}
          className="flex items-center gap-2 px-5 py-3 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white text-sm font-medium transition-colors shadow-accent"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {t('add')}
        </button>
      </div>

      {statusText && (
        <div className={`mt-3 flex items-center gap-2 text-sm animate-fade-in ${state === 'not_found' ? 'text-danger' : 'text-text-secondary'}`}>
          {state === 'not_found'
            ? <AlertCircle size={14} />
            : <Loader2 size={14} className="animate-spin" />
          }
          {statusText}
        </div>
      )}

      {lastSource && state === 'idle' && (
        <div className="mt-3 flex items-center gap-2 text-xs text-text-muted animate-fade-in">
          {lastSource === 'ai'
            ? <><Sparkles size={12} className="text-accent" /> {t('found_ai_badge')}</>
            : <><Database size={12} className="text-success" /> {t('found_db_badge')}</>
          }
        </div>
      )}
    </div>
  );
}
