'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Share2, X, Loader2, Copy, Check, Link as LinkIcon, Trash2 } from 'lucide-react';
import type { BagCapacities, BagActive, BagDistributionMode } from '@/domain/gear/BagRecommendation';

interface Props {
  listId: string | null;
  bagSetup: { capacities: BagCapacities; active: BagActive; mode: BagDistributionMode };
}

export function ShareButton({ listId, bagSetup }: Props) {
  const t = useTranslations('share');
  const [open, setOpen] = useState(false);

  if (!listId) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={t('share_list')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.07] text-text-secondary hover:text-white hover:border-white/20 text-xs transition-colors"
      >
        <Share2 size={12} />
        <span className="hidden sm:inline">{t('share_list')}</span>
      </button>
      {open && <ShareModal listId={listId} bagSetup={bagSetup} onClose={() => setOpen(false)} />}
    </>
  );
}

function ShareModal({ listId, bagSetup, onClose }: { listId: string; bagSetup: Props['bagSetup']; onClose: () => void }) {
  const t = useTranslations('share');
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Build the share URL once we have a slug
  const shareUrl = slug
    ? (typeof window === 'undefined' ? '' : `${window.location.origin}/${locale}/l/${slug}`)
    : null;

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/lists/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId, bagSetup }),
      });
      const data = await r.json();
      if (r.ok && data.slug) {
        setSlug(data.slug);
      } else {
        setError(data.error ?? `Error ${r.status}`);
      }
    } catch {
      setError(t('network_error'));
    } finally {
      setLoading(false);
    }
  }

  async function revoke() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/lists/share?listId=${listId}`, { method: 'DELETE' });
      if (r.ok) {
        setSlug(null);
      } else {
        const data = await r.json().catch(() => ({}));
        setError(data.error ?? `Error ${r.status}`);
      }
    } catch {
      setError(t('network_error'));
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#1c1a2e] border border-white/[0.07] rounded-2xl p-6 w-full max-w-md mx-4 shadow-card animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-white font-semibold text-lg">{t('share_list')}</h2>
          <button onClick={onClose} aria-label="Close" className="text-text-muted hover:text-white">
            <X size={18} />
          </button>
        </div>
        <p className="text-text-muted text-xs mb-5">{t('share_description')}</p>

        {!slug ? (
          <>
            <button
              onClick={generate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-accent hover:bg-accent-hover disabled:opacity-40 rounded-xl text-white text-sm font-medium transition-colors"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <LinkIcon size={14} />}
              {t('generate_link')}
            </button>
            <p className="text-text-muted text-[11px] mt-3 text-center">{t('readonly_note')}</p>
          </>
        ) : (
          <>
            <div className="bg-[#252340] border border-accent/30 rounded-xl px-3 py-2.5 mb-3 flex items-center gap-2">
              <input
                readOnly
                value={shareUrl ?? ''}
                onFocus={e => e.currentTarget.select()}
                className="flex-1 bg-transparent text-white text-xs focus:outline-none truncate"
              />
              <button
                onClick={copy}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? t('copied') : t('copy')}
              </button>
            </div>
            <button
              onClick={revoke}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 border border-white/[0.07] hover:border-danger/40 text-text-secondary hover:text-danger text-xs transition-colors rounded-xl"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              {t('revoke')}
            </button>
            <p className="text-text-muted text-[11px] mt-3 text-center">{t('anyone_can_see')}</p>
          </>
        )}

        {error && <p className="text-danger text-xs mt-3 text-center">{error}</p>}
      </div>
    </div>
  );
}
