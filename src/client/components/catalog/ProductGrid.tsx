import React from 'react';
import { Product } from '../../../shared/types/index.ts';
import { ProductCard } from './ProductCard.tsx';
import { Skeleton } from '../ui/Skeleton.tsx';

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ products, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-24">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="space-y-12">
            <Skeleton className="w-full aspect-[3/4]" />
            <Skeleton className="h-20 w-3/4" />
            <Skeleton className="h-16 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-64 border border-dashed border-border rounded-md bg-surface p-32">
        <h3 className="font-serif text-24 font-bold text-text">No Couture Pieces Found</h3>
        <p className="text-xs text-text-muted mt-8">Try adjusting your filters, gender selection, or search criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-24">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} />
      ))}
    </div>
  );
};
