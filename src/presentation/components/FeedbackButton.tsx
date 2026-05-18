'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Flag, X, Loader2, CheckCircle } from 'lucide-react';

type Field = 'volume' | 'weight' | 'name' | 'url' | 'variants' | 'other';

interface Props {
  itemId: string;
  itemName: string;
  /** Compact button is for inline use in dense tables; default is a small icon button. */
  variant?: 'inline' | 'icon';
}

export function FeedbackButton({ itemId, itemName, variant = 'icon' }: Props) {
  const t = useTranslations('feedback');
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        title={t('report')}
        aria-label={t('report')}
        className={
          variant === 'inline'
            ? 'inline-flex items-center gap-1 text-xs text-text-muted hover:text-warning transition-colors'
            : 'p-1.5 rounded-lg text-text-muted hover:text-warning hover:bg-warning/10 transition-colors'
        }
      >
        <Flag size={variant === 'inline' ? 11 : 13} />
        {variant === 'inline' && <span>{t('report_short')}</span>}
      </button>
      {open && <FeedbackModal itemId={itemId} itemName={itemName} onClose={() => setOpen(false)} />}
    </>
  );
}

function FeedbackModal({ itemId, itemName, onClose }: { itemId: string; itemName: string; onClose: () => void }) {
  const t = useTranslations('feedback');
  const [field, setField] = useState<Field>('volume');
  const [comment, setComment] = useState('');
  const [suggested, setSuggested] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!comment.trim() && !suggested.trim()) {
      setError(t('need_something'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          itemName,
          field,
          comment: comment.trim() || undefined,
          suggestedValue: suggested.trim() ? parseFloat(suggested) : undefined,
        }),
      });
      if (r.ok) {
        setDone(true);
        setTimeout(onClose, 1800);
      } else {
        const data = await r.json().catch(() => ({}));
        setError(data.error ?? `Error ${r.status}`);
      }
    } catch {
      setError(t('network_error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#1c1a2e] border border-white/[0.07] rounded-2xl p-6 w-full max-w-md mx-4 shadow-card animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-white font-semibold text-lg">{t('title')}</h2>
          <button onClick={onClose} aria-label="Close" className="text-text-muted hover:text-white">
            <X size={18} />
          </button>
        </div>
        <p className="text-text-muted text-xs mb-4">
          {t('for_item')}: <span className="text-text-secondary font-medium">{itemName}</span>
        </p>

        {done ? (
          <div className="text-center py-6 space-y-2">
            <CheckCircle size={32} className="text-success mx-auto" />
            <p className="text-white text-sm">{t('thanks')}</p>
          </div>
        ) : (
          <>
            <label className="block text-text-muted text-xs mb-1.5">{t('what_wrong')}</label>
            <select
              value={field}
              onChange={(e) => setField(e.target.value as Field)}
              className="w-full bg-[#252340] border border-white/[0.07] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent/60 mb-4"
            >
              <option value="volume">{t('field_volume')}</option>
              <option value="weight">{t('field_weight')}</option>
              <option value="name">{t('field_name')}</option>
              <option value="url">{t('field_url')}</option>
              <option value="variants">{t('field_variants')}</option>
              <option value="other">{t('field_other')}</option>
            </select>

            {(field === 'volume' || field === 'weight') && (
              <>
                <label className="block text-text-muted text-xs mb-1.5">
                  {field === 'volume' ? t('correct_volume') : t('correct_weight')}
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={suggested}
                  onChange={(e) => setSuggested(e.target.value)}
                  placeholder={field === 'volume' ? '3.5' : '354'}
                  className="w-full bg-[#252340] border border-white/[0.07] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent/60 mb-4"
                />
              </>
            )}

            <label className="block text-text-muted text-xs mb-1.5">{t('comment_label')}</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('comment_placeholder')}
              rows={3}
              className="w-full bg-[#252340] border border-white/[0.07] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-accent/60 mb-4 resize-none"
            />

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-40 rounded-xl text-white text-sm font-medium transition-colors"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Flag size={14} />}
              {t('submit')}
            </button>
            {error && <p className="text-danger text-xs mt-2 text-center">{error}</p>}
            <p className="text-text-muted text-[11px] mt-3 text-center">{t('anonymous_ok')}</p>
          </>
        )}
      </div>
    </div>
  );
}
