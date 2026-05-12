import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error';

export interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
}

// ─── Singleton event bus ──────────────────────────────────────────────────────
type ToastListener = (toast: ToastMessage) => void;
const listeners: ToastListener[] = [];

export const toast = {
  success: (message: string) => {
    const msg: ToastMessage = { id: Date.now().toString(), message, variant: 'success' };
    listeners.forEach(fn => fn(msg));
  },
  error: (message: string) => {
    const msg: ToastMessage = { id: Date.now().toString(), message, variant: 'error' };
    listeners.forEach(fn => fn(msg));
  },
};

// ─── Toast Provider (render at app root) ────────────────────────────────────
export const ToastProvider = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((t: ToastMessage) => {
    setToasts(prev => [...prev, t]);
    setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== t.id));
    }, 3500);
  }, []);

  useEffect(() => {
    listeners.push(addToast);
    return () => {
      const idx = listeners.indexOf(addToast);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-bold animate-in slide-in-from-right-4 duration-300 min-w-[260px] max-w-sm ${
            t.variant === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-900/40 border-rose-200 dark:border-rose-700 text-rose-800 dark:text-rose-200'
          }`}
        >
          {t.variant === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          ) : (
            <XCircle size={18} className="text-rose-500 shrink-0" />
          )}
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            className="opacity-50 hover:opacity-100 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
