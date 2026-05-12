'use client';

import { useState, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Search, Plus, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { categoryIcon } from '@/domain/gear/GearCategoryIcon';
import { CATEGORY_LABELS } from '@/domain/gear/GearCategory';
import { matchVariantByQuery } from '@/domain/gear/GearVariant';
import type { GearEntry } from './GearCalculator';

type SearchState = 'idle' | 'searching_db' | 'searching_ai' | 'not_found';

interface Variant { sizeLabel: string; volumeLiters: number; weightGrams?: number }

interface Candidate {
  query: string;
  source: 'db' | 'ai';
  item: {
    id: string;
    names: Record<string, string>;
    aliases?: string[];
    volumeLiters: number;
    weightGrams?: number;
    category: string;
    sourceUrl?: string;
    variants: Variant[];
  };
  confidence?: string;
  volumeNote?: string;
}

interface Props {
  onAdd: (entry: GearEntry) => void;
}

export function SearchBar({ onAdd }: Props) {
  const t = useTranslations('search');
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>('idle');
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const isLoading = state === 'searching_db' || state === 'searching_ai';

  async function handleSearch() {
    const q = query.trim();
    if (!q || isLoading) return;
    setCandidate(null);

    setState('searching_db');
    try {
      const res = await fetch(`/api/lookup?q=${encodeURIComponent(q)}&db_only=1`);
      const data = await res.json();
      if (data.status !== 'not_found') {
        const variants: Variant[] = data.item.variants ?? [];
        if (variants.length > 1) {
          // Show variant picker even for DB hits
          const matched = matchVariantByQuery(variants, q);
          const idx = matched ? variants.indexOf(matched) : 0;
          setSelectedVariantIdx(idx);
          setCandidate({ query: q, source: 'db', item: data.item });
          setState('idle');
        } else {
          addItem(data.item, q, 'db', variants[0]);
        }
        return;
      }
    } catch { /* fall through */ }

    setState('searching_ai');
    try {
      const res = await fetch(`/api/lookup?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.status === 'not_found') {
        setState('not_found');
        setTimeout(() => setState('idle'), 3500);
        return;
      }
      const variants: Variant[] = data.item.variants ?? [];
      const matched = matchVariantByQuery(variants, q);
      const idx = matched ? variants.indexOf(matched) : 0;
      setSelectedVariantIdx(idx);
      setCandidate({ query: q, source: 'ai', item: data.item, confidence: data.confidence, volumeNote: data.volumeNote });
      setState('idle');
    } catch {
      setState('not_found');
      setTimeout(() => setState('idle'), 3500);
    }
  }

  function addItem(item: Candidate['item'], q: string, source: 'db' | 'ai', variant?: Variant, confidence?: string) {
    const vol = variant?.volumeLiters ?? item.volumeLiters;
    const wgt = variant?.weightGrams ?? item.weightGrams;
    const name = item.names[locale] ?? item.names['en'];
    onAdd({
      id: uuidv4(),
      name,
      volumeLiters: vol,
      weightGrams: wgt,
      category: item.category,
      quantity: 1,
      source,
      confidence,
      sourceUrl: item.sourceUrl,
      sizeLabel: variant?.sizeLabel,
    });
    setQuery('');
    setState('idle');
    setCandidate(null);
    inputRef.current?.focus();
  }

  async function confirmCandidate(variantIdx: number) {
    if (!candidate) return;
    const variants = candidate.item.variants ?? [];
    const variant = variants[variantIdx];
    // Save to shared catalog only for AI-found items
    if (candidate.source === 'ai') {
      fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: candidate.item }),
      }).then(async r => {
        if (!r.ok) console.error('[lookup POST]', r.status, await r.text());
      }).catch(e => console.error('[lookup POST] network error', e));
    }
    addItem(candidate.item, candidate.query, candidate.source, variant, candidate.confidence);
  }

  function rejectCandidate() {
    setCandidate(null);
    setQuery('');
    inputRef.current?.focus();
  }

  const statusText =
    state === 'searching_db' ? t('searching_db') :
    state === 'searching_ai' ? t('searching_ai') :
    state === 'not_found' ? t('not_found') : null;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#1c1a2e] p-5 shadow-card space-y-4">
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
        <div className={`flex items-center gap-2 text-sm animate-fade-in ${state === 'not_found' ? 'text-danger' : 'text-text-secondary'}`}>
          {state === 'not_found' ? <AlertCircle size={14} /> : <Loader2 size={14} className="animate-spin" />}
          {statusText}
        </div>
      )}

      {candidate && (
        <ConfirmCard
          candidate={candidate}
          locale={locale}
          selectedIdx={selectedVariantIdx}
          onSelectIdx={setSelectedVariantIdx}
          onConfirm={confirmCandidate}
          onReject={rejectCandidate}
        />
      )}
    </div>
  );
}

function ConfirmCard({ candidate, locale, selectedIdx, onSelectIdx, onConfirm, onReject }: {
  candidate: Candidate;
  locale: string;
  selectedIdx: number;
  onSelectIdx: (i: number) => void;
  onConfirm: (variantIdx: number) => void;
  onReject: () => void;
}) {
  const t = useTranslations('search');
  const name = candidate.item.names[locale] ?? candidate.item.names['en'];
  const icon = categoryIcon(candidate.item.category);
  const catLabels = CATEGORY_LABELS[candidate.item.category as keyof typeof CATEGORY_LABELS];
  const catLabel = catLabels ? (catLabels[locale] ?? catLabels['en']) : candidate.item.category;
  const variants = candidate.item.variants ?? [];
  const selected = variants[selectedIdx] ?? { volumeLiters: candidate.item.volumeLiters, weightGrams: candidate.item.weightGrams };
  const confidenceColor = candidate.confidence === 'high' ? 'text-success' : candidate.confidence === 'low' ? 'text-warning' : 'text-text-secondary';
  const hasVariants = variants.length > 1;

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 animate-slide-up space-y-3">
      <p className="text-xs text-accent font-medium uppercase tracking-wider">
        {candidate.source === 'db' ? t('found_db_badge') : t('found_ai_badge')}
      </p>

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-text-muted text-xs mb-0.5">{icon} {catLabel}</p>
          <p className="text-white font-medium truncate">{name}</p>
          {candidate.volumeNote && (
            <p className="text-text-muted text-xs mt-1 italic">{candidate.volumeNote}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-white font-bold text-xl">{selected.volumeLiters}L</p>
          {selected.weightGrams && <p className="text-text-muted text-xs">{selected.weightGrams}g</p>}
          <p className={`text-xs mt-0.5 ${confidenceColor}`}>{candidate.confidence}</p>
        </div>
      </div>

      {/* Variant selector */}
      {hasVariants && (
        <div>
          <p className="text-text-muted text-xs mb-2">{t('select_size')}</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v, i) => (
              <button
                key={i}
                onClick={() => onSelectIdx(i)}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                  i === selectedIdx
                    ? 'border-accent bg-accent/20 text-white'
                    : 'border-white/[0.07] text-text-secondary hover:border-white/20 hover:text-white'
                }`}
              >
                {v.sizeLabel}
                <span className="text-xs ml-1.5 opacity-60">{v.volumeLiters}L{v.weightGrams ? ` · ${v.weightGrams}g` : ''}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {candidate.item.sourceUrl && (
        <a href={candidate.item.sourceUrl} target="_blank" rel="noopener noreferrer"
          className="text-xs text-accent/70 hover:text-accent underline truncate block">
          {candidate.item.sourceUrl.replace(/^https?:\/\//, '').split('/')[0]}
        </a>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onConfirm(selectedIdx)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg text-white text-sm font-medium transition-colors"
        >
          <CheckCircle size={14} />
          {hasVariants ? `${t('confirm')} · ${variants[selectedIdx]?.sizeLabel}` : t('confirm')}
        </button>
        <button
          onClick={onReject}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-white/[0.07] hover:border-white/20 rounded-lg text-text-secondary hover:text-white text-sm transition-colors"
        >
          <XCircle size={14} /> {t('reject')}
        </button>
      </div>
    </div>
  );
}
