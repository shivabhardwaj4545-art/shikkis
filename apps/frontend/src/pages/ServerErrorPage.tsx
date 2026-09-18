import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Home, RefreshCw } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { fadeIn, fadeInUp, useMotionSafe } from '@/lib/motion';

interface ServerErrorPageProps {
  error?: Error | undefined;
  resetError?: (() => void) | undefined;
}

export const ServerErrorPage: React.FC<ServerErrorPageProps> = ({ error, resetError }) => {
  const containerVariants = useMotionSafe(fadeIn);
  const cardVariants = useMotionSafe(fadeInUp);

  const handleReload = () => {
    if (resetError) {
      resetError();
    } else {
      window.location.reload();
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-[80vh] flex items-center justify-center py-16 px-4 md:px-8 bg-bg text-text"
    >
      <motion.div
        variants={cardVariants}
        className="max-w-xl w-full text-center space-y-6 bg-surface border border-border rounded-2xl p-8 sm:p-12 shadow-xl relative overflow-hidden"
      >
        {/* Subtle decorative glow */}
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 w-60 h-60 bg-danger/10 rounded-full blur-3xl pointer-events-none"
        />

        {/* Warning Icon Badge */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger/15 border border-danger/30 text-danger shadow-inner">
          <AlertTriangle size={32} aria-hidden />
        </div>

        {/* 500 Heading */}
        <div className="space-y-2">
          <span className="block font-serif text-6xl font-light tracking-tighter text-danger">
            500
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-text">
            An Unforeseen Interruption
          </h1>
          <p className="text-xs sm:text-sm text-text-muted max-w-md mx-auto leading-relaxed">
            Our artisan atelier encountered an unexpected obstacle while crafting this experience.
            Please rest assured our caretakers have been notified.
          </p>
        </div>

        {/* Error message for debug in development */}
        {process.env.NODE_ENV === 'development' && error && (
          <div className="rounded-lg bg-surface-alt/90 border border-danger/30 p-3 text-left overflow-auto max-h-36">
            <p className="font-mono text-[11px] text-danger font-medium leading-normal">
              {error.message}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleReload}
            className="min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-brand-crimson text-white font-medium text-xs sm:text-sm hover:bg-brand-crimson/90 active:scale-[0.98] transition-all shadow-md"
          >
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>

          <Link
            to="/"
            className="min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-surface text-text border border-border hover:border-brand-gold font-medium text-xs sm:text-sm transition-colors"
          >
            <Home size={14} />
            <span>Return to Sanctuary</span>
          </Link>

          <Link
            to="/catalog"
            className="min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-surface-alt text-text hover:text-brand-crimson dark:hover:text-brand-gold font-medium text-xs sm:text-sm transition-colors"
          >
            <span>Explore Catalog</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
};
