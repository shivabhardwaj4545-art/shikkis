import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useToastStore } from '../../hooks/useToastStore.ts';
import { useReducedMotion } from '../../hooks/useReducedMotion.ts';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();
  const prefersReduced = useReducedMotion();

  const toastVariants = prefersReduced
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : {
        hidden: { opacity: 0, y: -20, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1 },
      };

  return (
    <div className="fixed top-16 right-16 z-50 flex flex-col gap-8 pointer-events-none max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            variants={toastVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className={`pointer-events-auto p-16 rounded-md shadow-lg border flex items-center gap-12 bg-surface text-text border-border`}
          >
            {toast.type === 'success' && <CheckCircle className="w-20 h-20 text-success shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-20 h-20 text-danger shrink-0" />}
            {toast.type === 'info' && <Info className="w-20 h-20 text-brand-gold shrink-0" />}

            <p className="text-sm font-medium flex-1">{toast.message}</p>

            <button
              onClick={() => removeToast(toast.id)}
              className="p-4 text-text-muted hover:text-text rounded-sm min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Dismiss toast"
            >
              <X className="w-16 h-16" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
