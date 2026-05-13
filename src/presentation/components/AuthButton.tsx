'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { LogIn, LogOut, User, Loader2, CheckCircle } from 'lucide-react';
import { createClient } from '@/infrastructure/supabase/client';

interface Props {
  user: { email?: string } | null;
}

export function AuthButton({ user }: Props) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), locale }),
      });
      if (r.ok) {
        setSent(true);
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

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 text-text-secondary text-xs">
          <User size={12} />
          {user.email}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.07] text-text-secondary hover:text-white hover:border-white/20 text-xs transition-colors"
        >
          <LogOut size={12} /> {t('logout')}
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-xl text-white text-sm font-medium transition-colors"
      >
        <LogIn size={14} /> {t('login')}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-[#1c1a2e] border border-white/[0.07] rounded-2xl p-6 w-full max-w-sm mx-4 shadow-card animate-slide-up" onClick={e => e.stopPropagation()}>
            {sent ? (
              <div className="text-center py-4 space-y-3">
                <CheckCircle size={36} className="text-success mx-auto" />
                <p className="text-white font-medium">{t('check_email')}</p>
                <p className="text-text-muted text-sm">{t('magic_link_sent')} <span className="text-white">{email}</span></p>
              </div>
            ) : (
              <>
                <h2 className="text-white font-semibold text-lg mb-1">{t('login')}</h2>
                <p className="text-text-muted text-sm mb-5">{t('login_subtitle')}</p>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="you@example.com"
                  autoFocus
                  className="w-full bg-[#252340] border border-white/[0.07] rounded-xl px-4 py-3 text-white placeholder-text-muted text-sm focus:outline-none focus:border-accent/60 mb-3"
                />
                <button
                  onClick={handleLogin}
                  disabled={!email.trim() || loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-accent hover:bg-accent-hover disabled:opacity-40 rounded-xl text-white text-sm font-medium transition-colors"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                  {t('send_link')}
                </button>
                {error && (
                  <p className="text-danger text-sm mt-3 text-center">{error}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
