import React from 'react';

interface SkeletonProps {
  /** CSS class string for sizing/layout */
  className?: string;
  /** Accessible label for screen readers */
  'aria-label'?: string;
}

/**
 * Skeleton loader — shimmer animation via the .shimmer utility in index.css.
 * Respects reduced motion via CSS animation media query.
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '', 'aria-label': ariaLabel }) => (
  <div
    role="status"
    aria-label={ariaLabel ?? 'Loading…'}
    className={`shimmer rounded-md bg-surface-alt ${className}`}
  />
);

/** Pre-composed product card skeleton */
export const ProductCardSkeleton: React.FC = () => (
  <div className="flex flex-col gap-3" aria-label="Loading product">
    <Skeleton className="aspect-[3/4] w-full rounded-lg" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-3 w-1/2" />
    <Skeleton className="h-5 w-1/3" />
  </div>
);

/** Pre-composed page header skeleton */
export const PageHeaderSkeleton: React.FC = () => (
  <div className="flex flex-col gap-2 py-8">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-4 w-48" />
  </div>
);
