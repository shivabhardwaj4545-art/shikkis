import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import React, { useCallback, useEffect } from 'react';
import { create } from 'zustand';

import type { Variants } from 'framer-motion';

import { useMotionSafe } from '@/lib/motion';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  /** Milliseconds before auto-dismiss. Default: 4000. Set 0 to persist. */
  duration?: number;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface ToastStore {
  toasts: Toast[];
  add: (toast: Omit<Toast, 'id'>) => string;
  remove: (id: string) => void;
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (toast) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    return id;
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// ─── Public API ───────────────────────────────────────────────────────────────

/** Imperative toast helpers — call from anywhere (not just components) */
export const toast = {
  success: (message: string, duration = 4000) =>
    useToastStore.getState().add({ type: 'success', message, duration }),
  error: (message: string, duration = 5000) =>
    useToastStore.getState().add({ type: 'error', message, duration }),
  warning: (message: string, duration = 4000) =>
    useToastStore.getState().add({ type: 'warning', message, duration }),
  info: (message: string, duration = 4000) =>
    useToastStore.getState().add({ type: 'info', message, duration }),
};

// ─── Toast Item Component ─────────────────────────────────────────────────────

const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const TYPE_STYLES: Record<ToastType, string> = {
  success: 'border-l-success text-success',
  error: 'border-l-danger text-danger',
  warning: 'border-l-warning text-warning',
  info: 'border-l-brand-crimson text-brand-crimson',
};

const toastItemVariants: Variants = {
  hidden: { opacity: 0, x: 48, scale: 0.95 },
  visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  exit: { opacity: 0, x: 48, scale: 0.95, transition: { duration: 0.2 } },
};

const ToastItem: React.FC<{ toast: Toast }> = ({ toast: t }) => {
  const remove = useToastStore((s) => s.remove);
  const safeVariants = useMotionSafe(toastItemVariants);
  const Icon = ICONS[t.type];

  const dismiss = useCallback(() => remove(t.id), [remove, t.id]);

  useEffect(() => {
    if (!t.duration) return;
    const timer = setTimeout(dismiss, t.duration);
    return () => clearTimeout(timer);
  }, [dismiss, t.duration]);

  return (
    <motion.div
      layout
      variants={safeVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      role="alert"
      aria-live="polite"
      className={[
        'flex items-start gap-3 rounded-lg border border-border border-l-4 bg-surface',
        'px-4 py-3 shadow-lg max-w-sm w-full',
        TYPE_STYLES[t.type],
      ].join(' ')}
    >
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
      <p className="flex-1 text-sm text-text leading-snug">{t.message}</p>
      <button
        onClick={dismiss}
        aria-label="Dismiss notification"
        className="shrink-0 text-text-muted hover:text-text transition-colors"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
};

// ─── Container ────────────────────────────────────────────────────────────────

/** Mount this once in AppLayout — it renders the toast stack */
export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col-reverse gap-3 items-end pointer-events-none [&>*]:pointer-events-auto">
      <AnimatePresence mode="sync">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  );
};
