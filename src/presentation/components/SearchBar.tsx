'use client';

import { useState, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Search, Plus, Loader2, AlertCircle, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { categoryIcon } from '@/domain/gear/GearCategoryIcon';
import { CATEGORY_LABELS } from '@/domain/gear/GearCategory';
import { matchVariantByQuery } from '@/domain/gear/GearVariant';
import { trackedOutboundUrl } from '@/presentation/utils/safeUrl';
import type { GearEntry } from './GearCalculator';

type SearchState = 'idle' | 'searching_db' | 'searching_ai' | 'not_found' | 'picking' | 'auth_required' | 'rate_limited' | 'budget_exceeded';

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
  depth: number;
}

const MAX_DEPTH = 3;

interface Props {
  onAdd: (entry: GearEntry) => void;
}

export function SearchBar({ onAdd }: Props) {
  const t = useTranslations('search');
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>('idle');
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [pickList, setPickList] = useState<Candidate['item'][]>([]);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const isLoading = state === 'searching_db' || state === 'searching_ai';

  async function handleSearch() {
    const q = query.trim();
    if (!q || isLoading) return;
    setCandidate(null);
    setPickList([]);

    setState('searching_db');
    try {
      const res = await fetch(`/api/lookup?q=${encodeURIComponent(q)}&db_only=1`);
      const data = await res.json();
      if (data.status === 'found_many') {
        setPickList(data.items);
        setState('picking');
        return;
      }
      if (data.status === 'found_db') {
        const variants: Variant[] = data.item.variants ?? [];
        const matched = matchVariantByQuery(variants, q);
        const idx = matched ? variants.indexOf(matched) : 0;
        setSelectedVariantIdx(idx);
        setCandidate({ query: q, source: 'db', item: data.item, depth: 1 });
        setState('idle');
        return;
      }
    } catch (err) {
      // Network/parse error on the DB lookup — log and fall through to AI search
      console.warn('[SearchBar] DB lookup failed, falling back to AI:', err);
    }

    await runAiSearch(q, 1);
  }

  function pickItem(item: Candidate['item']) {
    const variants: Variant[] = item.variants ?? [];
    const matched = matchVariantByQuery(variants, query.trim());
    const idx = matched ? variants.indexOf(matched) : 0;
    setSelectedVariantIdx(idx);
    setCandidate({ query: query.trim(), source: 'db', item, depth: 1 });
    setPickList([]);
    setState('idle');
  }

  function cancelPick() {
    setPickList([]);
    setState('idle');
    inputRef.current?.focus();
  }

  async function runAiSearch(q: string, depth: number, preserveId?: string, fallback?: Candidate) {
    setState('searching_ai');
    try {
      const res = await fetch(`/api/lookup?q=${encodeURIComponent(q)}&depth=${depth}`);
      if (res.status === 401) {
        if (fallback) { setCandidate(fallback); setState('idle'); }
        else { setState('auth_required'); setTimeout(() => setState('idle'), 5000); }
        return;
      }
      if (res.status === 429) {
        if (fallback) { setCandidate(fallback); setState('idle'); }
        else { setState('rate_limited'); setTimeout(() => setState('idle'), 5000); }
        return;
      }
      if (res.status === 503) {
        if (fallback) { setCandidate(fallback); setState('idle'); }
        else { setState('budget_exceeded'); setTimeout(() => setState('idle'), 5000); }
        return;
      }
      const data = await res.json();
      if (data.status === 'not_found') {
        if (fallback) {
          setCandidate(fallback);
          setState('idle');
        } else {
          setState('not_found');
          setTimeout(() => setState('idle'), 3500);
        }
        return;
      }
      // If refining an existing DB record, keep its id so upsert updates the row
      if (preserveId) data.item.id = preserveId;
      const variants: Variant[] = data.item.variants ?? [];
      const matched = matchVariantByQuery(variants, q);
      const idx = matched ? variants.indexOf(matched) : 0;
      setSelectedVariantIdx(idx);
      setCandidate({ query: q, source: 'ai', item: data.item, confidence: data.confidence, volumeNote: data.volumeNote, depth });
      setState('idle');
    } catch {
      if (fallback) {
        setCandidate(fallback);
        setState('idle');
      } else {
        setState('not_found');
        setTimeout(() => setState('idle'), 3500);
      }
    }
  }

  function digDeeper() {
    if (!candidate || candidate.depth >= MAX_DEPTH) return;
    runAiSearch(candidate.query, candidate.depth + 1, candidate.item.id, candidate);
  }

  function addItem(item: Candidate['item'], q: string, source: 'db' | 'ai', variant?: Variant, confidence?: string) {
    const vol = variant?.volumeLiters ?? item.volumeLiters;
    const wgt = variant?.weightGrams ?? item.weightGrams;
    const name = item.names['en'];
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
      try {
        const r = await fetch('/api/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item: candidate.item }),
          keepalive: true,
        });
        // 401 means guest — silently skip (item still goes to local list)
        if (!r.ok && r.status !== 401) {
          const e = await r.json().catch(() => ({}));
          console.error('[lookup POST] save failed:', r.status, e);
        }
      } catch (err) {
        console.error('[lookup POST] network error:', err);
      }
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
    state === 'not_found' ? t('not_found') :
    state === 'auth_required' ? t('auth_required') :
    state === 'rate_limited' ? t('rate_limited') :
    state === 'budget_exceeded' ? t('budget_exceeded') : null;
  const isErrorState = state === 'not_found' || state === 'auth_required' || state === 'rate_limited' || state === 'budget_exceeded';

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
          disabled={!query.trim() || isLoading || !!candidate || state === 'picking'}
          className="flex items-center gap-2 px-5 py-3 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white text-sm font-medium transition-colors shadow-accent"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {t('add')}
        </button>
      </div>

      {!candidate && state === 'idle' && (
        <p className="text-xs text-text-muted">{t('search_hint')}</p>
      )}

      {statusText && (
        <div className={`flex items-center gap-2 text-sm animate-fade-in ${isErrorState ? 'text-danger' : 'text-text-secondary'}`}>
          {isErrorState ? <AlertCircle size={14} /> : <Loader2 size={14} className="animate-spin" />}
          {statusText}
        </div>
      )}

      {state === 'picking' && pickList.length > 0 && (
        <PickList
          items={pickList}
          locale={locale}
          onPick={pickItem}
          onCancel={cancelPick}
        />
      )}

      {candidate && (
        <ConfirmCard
          candidate={candidate}
          locale={locale}
          selectedIdx={selectedVariantIdx}
          onSelectIdx={setSelectedVariantIdx}
          onConfirm={confirmCandidate}
          onReject={rejectCandidate}
          onDigDeeper={digDeeper}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

function PickList({ items, locale, onPick, onCancel }: {
  items: Candidate['item'][];
  locale: string;
  onPick: (item: Candidate['item']) => void;
  onCancel: () => void;
}) {
  const t = useTranslations('search');
  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 animate-slide-up space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-accent font-medium uppercase tracking-wider">{t('found_db_badge')}</p>
        <button onClick={onCancel} className="text-text-muted hover:text-white transition-colors">
          <XCircle size={14} />
        </button>
      </div>
      <div className="space-y-1">
        {items.map(item => {
          const name = item.names['en'];
          const icon = categoryIcon(item.category);
          const catLabels = CATEGORY_LABELS[item.category as keyof typeof CATEGORY_LABELS];
          const catLabel = catLabels ? (catLabels[locale] ?? catLabels['en']) : item.category;
          const firstVariant = item.variants?.[0];
          const vol = firstVariant?.volumeLiters ?? item.volumeLiters;
          const hasVariants = (item.variants?.length ?? 0) > 1;
          return (
            <button
              key={item.id}
              onClick={() => onPick(item)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-white/[0.07] hover:border-accent/40 hover:bg-accent/10 text-left transition-all group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-text-muted text-xs">{icon} {catLabel}</p>
                <p className="text-white text-sm font-medium truncate group-hover:text-white">{name}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-white font-semibold">{vol}L</p>
                {hasVariants && <p className="text-text-muted text-xs">{item.variants.length} sizes</p>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ConfirmCard({ candidate, locale, selectedIdx, onSelectIdx, onConfirm, onReject, onDigDeeper, isLoading }: {
  candidate: Candidate;
  locale: string;
  selectedIdx: number;
  onSelectIdx: (i: number) => void;
  onConfirm: (variantIdx: number) => void;
  onReject: () => void;
  onDigDeeper: () => void;
  isLoading: boolean;
}) {
  const t = useTranslations('search');
  const name = candidate.item.names['en'];
  const icon = categoryIcon(candidate.item.category);
  const catLabels = CATEGORY_LABELS[candidate.item.category as keyof typeof CATEGORY_LABELS];
  const catLabel = catLabels ? (catLabels[locale] ?? catLabels['en']) : candidate.item.category;
  const variants = candidate.item.variants ?? [];
  const selected = variants[selectedIdx] ?? { volumeLiters: candidate.item.volumeLiters, weightGrams: candidate.item.weightGrams };
  const confidenceColor = candidate.confidence === 'high' ? 'text-success' : candidate.confidence === 'low' ? 'text-warning' : 'text-text-secondary';
  const hasVariants = variants.length > 1;
  const canDigDeeper = candidate.depth < MAX_DEPTH;

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

      {(() => {
        const trackedUrl = trackedOutboundUrl(candidate.item.sourceUrl, candidate.item.id);
        if (!trackedUrl) return null;
        // Display only the bare hostname; the actual click goes through our /r redirect
        const hostname = candidate.item.sourceUrl!.replace(/^https?:\/\//, '').split('/')[0];
        return (
          <a href={trackedUrl} target="_blank" rel="noopener noreferrer sponsored"
            className="text-xs text-accent/70 hover:text-accent underline truncate block">
            {hostname}
          </a>
        );
      })()}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onConfirm(selectedIdx)}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-40 rounded-lg text-white text-sm font-medium transition-colors"
        >
          <CheckCircle size={14} />
          {hasVariants ? `${t('confirm')} · ${variants[selectedIdx]?.sizeLabel}` : t('confirm')}
        </button>
        <button
          onClick={onReject}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-white/[0.07] hover:border-white/20 disabled:opacity-40 rounded-lg text-text-secondary hover:text-white text-sm transition-colors"
        >
          <XCircle size={14} /> {t('reject')}
        </button>
      </div>

      {canDigDeeper && (
        <button
          onClick={onDigDeeper}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-accent/30 bg-accent/5 hover:bg-accent/10 disabled:opacity-40 rounded-lg text-accent text-xs font-medium transition-colors"
        >
          {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {t('dig_deeper')} · {candidate.depth}/{MAX_DEPTH}
        </button>
      )}
    </div>
  );
}
