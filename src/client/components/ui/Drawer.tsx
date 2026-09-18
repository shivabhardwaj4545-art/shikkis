import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion.ts';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, title, children }) => {
  const prefersReduced = useReducedMotion();

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const panelVariants = prefersReduced
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : {
        hidden: { x: '100%' },
        visible: { x: 0 },
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            onClick={onClose}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex">
            <motion.div
              className="w-screen max-w-full sm:w-[420px] bg-surface border-l border-border shadow-2xl flex flex-col h-full"
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="p-16 border-b border-border flex items-center justify-between">
                {title && <h3 className="text-xl font-serif font-bold text-text">{title}</h3>}
                <button
                  onClick={onClose}
                  className="p-8 text-text-muted hover:text-text rounded-sm min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close drawer"
                >
                  <X className="w-20 h-20" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-16">{children}</div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
