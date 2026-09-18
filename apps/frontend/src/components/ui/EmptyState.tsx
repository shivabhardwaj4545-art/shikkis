import { motion } from 'framer-motion';
import { PackageSearch } from 'lucide-react';
import React from 'react';

import { useMotionSafe, fadeInUp } from '@/lib/motion';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Nothing here yet',
  description,
  icon: Icon = PackageSearch,
  action,
}) => {
  const variants = useMotionSafe(fadeInUp);

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center gap-4 py-20 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-alt text-text-muted">
        <Icon size={28} aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-serif text-xl text-text">{title}</h3>
        {description && <p className="text-sm text-text-muted max-w-xs">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  );
};
