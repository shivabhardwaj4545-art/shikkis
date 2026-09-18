import { AnimatePresence, motion } from 'framer-motion';
import { Monitor, Moon, Sun } from 'lucide-react';
import React from 'react';

import { useMotionSafe } from '@/lib/motion';
import { useTheme } from '@/hooks/useTheme';

import type { Variants } from 'framer-motion';
import type { ThemePreference } from '@/hooks/useTheme';

const OPTIONS: { value: ThemePreference; icon: React.ElementType; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'system', icon: Monitor, label: 'System' },
  { value: 'dark', icon: Moon, label: 'Dark' },
];

const iconVariants: Variants = {
  hidden: { opacity: 0, scale: 0.6, rotate: -30 },
  visible: { opacity: 1, scale: 1, rotate: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
  exit: { opacity: 0, scale: 0.6, rotate: 30, transition: { duration: 0.15 } },
};

/**
 * ThemeToggle — cycles through light / system / dark.
 *
 * Displays the current mode icon with an animated crossfade.
 * Long-press or right-click could extend to a popover picker — left as future
 * enhancement.
 */
export const ThemeToggle: React.FC = () => {
  const { preference, setPreference } = useTheme();
  const safeVariants = useMotionSafe(iconVariants);

  const currentIndex = OPTIONS.findIndex((o) => o.value === preference);
  const CurrentOption = OPTIONS[currentIndex] ?? OPTIONS[1];

  const handleToggle = () => {
    const nextIndex = (currentIndex + 1) % OPTIONS.length;
    const next = OPTIONS[nextIndex];
    if (next) setPreference(next.value);
  };

  return (
    <button
      id="theme-toggle"
      onClick={handleToggle}
      aria-label={`Switch theme (current: ${CurrentOption.label})`}
      title={`Theme: ${CurrentOption.label}`}
      className={[
        'relative flex h-9 w-9 items-center justify-center rounded-full',
        'border border-border bg-surface-alt',
        'text-text-muted hover:text-text hover:border-brand-gold',
        'transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-1',
      ].join(' ')}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={preference}
          variants={safeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="flex items-center justify-center"
        >
          <CurrentOption.icon size={16} aria-hidden />
        </motion.span>
      </AnimatePresence>
    </button>
  );
};
