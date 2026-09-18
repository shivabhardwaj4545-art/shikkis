import React from 'react';
import { useCartStore } from '@/stores/cart.store';

/**
 * CartLiveRegion — persistent, invisible ARIA live region for announcing
 * cart mutations (add, update, remove, coupon) to assistive technologies.
 */
export const CartLiveRegion: React.FC = () => {
  const announcement = useCartStore((s) => s.announcement);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      role="status"
    >
      {announcement || ''}
    </div>
  );
};
