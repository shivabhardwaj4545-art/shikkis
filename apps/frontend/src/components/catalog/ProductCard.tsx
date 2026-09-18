import { Eye } from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import type { ProductItem } from '@/lib/api';
import { formatDiscount, formatPrice } from '@/lib/format';

interface ProductCardProps {
  product: ProductItem;
  onQuickView?: (product: ProductItem) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onQuickView }) => {
  const [isHovered, setIsHovered] = useState(false);
  const primaryImg = product.images[0] || '/placeholder.jpg';
  const secondaryImg = product.images[1];

  // Stock calculations
  const totalStock = product.total_stock ?? 0;
  let stockLabel = 'In Stock';
  let stockBadgeClass = 'bg-success/15 text-success border-success/30';

  if (totalStock === 0) {
    stockLabel = 'Out of Stock';
    stockBadgeClass = 'bg-danger/15 text-danger border-danger/30';
  } else if (totalStock <= 5) {
    stockLabel = `Only ${totalStock} left`;
    stockBadgeClass = 'bg-warning/15 text-warning border-warning/30';
  }

  const hasDiscount = product.price.effective_discount_percent > 0;

  return (
    <article
      className="group relative flex flex-col rounded-lg border border-border bg-surface overflow-hidden transition-all duration-300 hover:shadow-md hover:border-brand-gold/50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Image Container ──────────────────────────────────────────────── */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-alt">
        <Link to={`/products/${product.slug}`} className="block h-full w-full">
          {/* Primary image */}
          <img
            src={primaryImg}
            alt={product.name}
            loading="lazy"
            className={[
              'h-full w-full object-cover object-top transition-transform duration-500 ease-out',
              'group-hover:scale-[1.04]',
              secondaryImg && isHovered ? 'opacity-0' : 'opacity-100',
            ].join(' ')}
          />

          {/* Secondary image for crossfade */}
          {secondaryImg && (
            <img
              src={secondaryImg}
              alt={`${product.name} alternate view`}
              loading="lazy"
              className={[
                'absolute inset-0 h-full w-full object-cover object-top transition-all duration-500 ease-out',
                'group-hover:scale-[1.04]',
                isHovered ? 'opacity-100' : 'opacity-0',
              ].join(' ')}
            />
          )}
        </Link>

        {/* Discount badge in top-left */}
        {hasDiscount && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="inline-flex items-center rounded-sm bg-brand-crimson px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white uppercase shadow-sm">
              {formatDiscount(product.price.effective_discount_percent)}
            </span>
          </div>
        )}

        {/* Stock pill in top-right */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-tight backdrop-blur-md ${stockBadgeClass}`}
          >
            <span
              className={`mr-1 h-1.5 w-1.5 rounded-full ${
                totalStock === 0 ? 'bg-danger' : totalStock <= 5 ? 'bg-warning' : 'bg-success'
              }`}
            />
            {stockLabel}
          </span>
        </div>

        {/* Quick View Button (hover reveal on desktop, always visible on touch) */}
        {onQuickView && (
          <div className="absolute bottom-3 inset-x-3 z-10 transition-all duration-200 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 max-md:opacity-100 max-md:translate-y-0">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onQuickView(product);
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-surface/90 hover:bg-surface text-text text-xs font-medium py-2 px-3 backdrop-blur-sm border border-border shadow-sm hover:border-brand-gold hover:text-brand-crimson dark:hover:text-brand-gold transition-colors"
              aria-label={`Quick view ${product.name}`}
            >
              <Eye size={14} />
              <span>Quick View</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Details ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        {/* Category & Fabric badge */}
        <div className="mb-1 flex items-center justify-between text-[11px] text-text-muted">
          <span className="uppercase tracking-wider font-medium">{product.category_name}</span>
          <span className="truncate max-w-[110px]">{product.fabric}</span>
        </div>

        {/* Product Name */}
        <h3 className="line-clamp-2 text-sm font-medium text-text transition-colors group-hover:text-brand-crimson dark:group-hover:text-brand-gold">
          <Link to={`/products/${product.slug}`}>{product.name}</Link>
        </h3>

        {/* Price block */}
        <div className="mt-auto pt-3 flex items-baseline gap-2">
          {/* Final price in crimson (gold on dark) */}
          <span className="font-serif text-base font-semibold text-brand-crimson dark:text-brand-gold">
            {formatPrice(product.price.final_price_paise)}
          </span>

          {/* Struck-through MRP */}
          {hasDiscount && (
            <span className="text-xs text-text-muted line-through">
              {formatPrice(product.price.mrp_paise)}
            </span>
          )}
        </div>

        {/* Applied active promotional offer notice */}
        {product.price.applied_offer && (
          <p className="mt-1 text-[10px] font-medium text-brand-gold truncate">
            ✨ {product.price.applied_offer.name}
          </p>
        )}
      </div>
    </article>
  );
};
