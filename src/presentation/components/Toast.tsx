'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

type ToastKind = 'success' | 'error';
interface Toast { id: number; kind: ToastKind; text: string }

interface Ctx { show: (kind: ToastKind, text: string) => void }
const ToastCtx = createContext<Ctx>({ show: () => {} });

export function useToast() { return useContext(ToastCtx); }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const show = useCallback((kind: ToastKind, text: string) => {
    const id = Date.now() + Math.random();
    setItems(prev => [...prev, { id, kind, text }]);
    setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {items.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm shadow-lg ${
              t.kind === 'success'
                ? 'bg-[#1c1a2e] border-success/40 text-white'
                : 'bg-[#1c1a2e] border-red-500/40 text-white'
            }`}
          >
            {t.kind === 'success' ? <CheckCircle size={16} className="text-success" /> : <AlertCircle size={16} className="text-red-400" />}
            <span>{t.text}</span>
            <button onClick={() => setItems(prev => prev.filter(x => x.id !== t.id))} className="ml-2 text-text-muted hover:text-white">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
