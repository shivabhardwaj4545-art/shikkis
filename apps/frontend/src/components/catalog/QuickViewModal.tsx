import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import type { ProductItem, ProductVariant } from '@/lib/api';
import { formatDiscount, formatPrice } from '@/lib/format';
import { fadeIn, scaleIn } from '@/lib/motion';
import { useFocusTrap } from '@/lib/useFocusTrap';

interface QuickViewModalProps {
  product: ProductItem | null;
  onClose: () => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, onClose }) => {
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  const modalRef = useFocusTrap<HTMLDivElement>({
    isOpen: !!product,
    onClose,
    autoFocusFirst: false,
  });

  // Initialize selected size and color when product opens
  useEffect(() => {
    if (product && product.variants.length > 0) {
      const inStockVar = product.variants.find((v) => v.stock > 0) || product.variants[0];
      setSelectedSize(inStockVar.size);
      setSelectedColor(inStockVar.color);
      setActiveImgIndex(0);
    }
  }, [product]);

  if (!product) return null;

  // Extract unique sizes and colors
  const sizes = Array.from(new Set(product.variants.map((v) => v.size)));
  const colors = Array.from(new Set(product.variants.map((v) => v.color)));

  // Find currently matched variant
  const currentVariant: ProductVariant | undefined = product.variants.find(
    (v) => v.size === selectedSize && v.color === selectedColor
  );

  const isCurrentInStock = currentVariant ? currentVariant.stock > 0 : false;
  const currentStock = currentVariant?.stock ?? 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal Window */}
        <motion.div
          ref={modalRef}
          tabIndex={-1}
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quickview-title"
          className="relative z-10 w-full max-w-3xl rounded-xl border border-border bg-surface shadow-2xl overflow-hidden focus:outline-none"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 z-20 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-surface/80 hover:bg-surface border border-border text-text-muted hover:text-text transition-colors shadow-sm"
          >
            <X size={18} />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Gallery / Images */}
            <div className="relative bg-surface-alt aspect-[3/4] flex flex-col justify-between p-4">
              <div className="relative h-full w-full overflow-hidden rounded-lg">
                <img
                  src={product.images[activeImgIndex] || product.images[0]}
                  alt={product.name}
                  className="h-full w-full object-cover object-top"
                />
              </div>

              {/* Thumbnails if > 1 image */}
              {product.images.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImgIndex(idx)}
                      className={`h-14 w-11 flex-shrink-0 rounded overflow-hidden border-2 transition-all ${
                        activeImgIndex === idx ? 'border-brand-gold' : 'border-transparent opacity-70'
                      }`}
                    >
                      <img src={img} alt="thumbnail" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info and Variant Selection */}
            <div className="p-6 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-gold">
                  {product.category_name}
                </span>

                <h2 id="quickview-title" className="font-serif text-xl font-semibold text-text mt-1">
                  {product.name}
                </h2>

                {/* Price block */}
                <div className="mt-3 flex items-baseline gap-3">
                  <span className="font-serif text-2xl font-bold text-brand-crimson dark:text-brand-gold">
                    {formatPrice(product.price.final_price_paise)}
                  </span>
                  {product.price.effective_discount_percent > 0 && (
                    <>
                      <span className="text-sm text-text-muted line-through">
                        {formatPrice(product.price.mrp_paise)}
                      </span>
                      <span className="rounded bg-brand-crimson/15 text-brand-crimson dark:text-brand-gold text-xs font-semibold px-2 py-0.5">
                        {formatDiscount(product.price.effective_discount_percent)}
                      </span>
                    </>
                  )}
                </div>

                <p className="mt-3 text-xs text-text-muted line-clamp-3 leading-relaxed">
                  {product.description}
                </p>

                {/* Color Selector */}
                <div className="mt-5">
                  <label className="block text-xs font-medium text-text mb-2">
                    Colour: <span className="font-semibold text-brand-crimson dark:text-brand-gold">{selectedColor}</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((c) => {
                      // Check if any variant with this color is in stock
                      const hasStock = product.variants.some((v) => v.color === c && v.stock > 0);
                      const isSelected = selectedColor === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          disabled={!hasStock}
                          onClick={() => setSelectedColor(c)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                            isSelected
                              ? 'border-brand-crimson bg-brand-crimson text-white shadow-sm'
                              : hasStock
                              ? 'border-border bg-surface text-text hover:border-brand-gold'
                              : 'border-border/40 bg-surface-alt/50 text-text-muted/40 cursor-not-allowed line-through'
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Size Selector */}
                <div className="mt-4">
                  <label className="block text-xs font-medium text-text mb-2">
                    Size: <span className="font-semibold text-brand-crimson dark:text-brand-gold">{selectedSize}</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((s) => {
                      // Check if this size + current color has stock
                      const matchingVar = product.variants.find(
                        (v) => v.size === s && v.color === selectedColor
                      );
                      const hasStock = matchingVar ? matchingVar.stock > 0 : false;
                      const isSelected = selectedSize === s;

                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={!hasStock}
                          onClick={() => setSelectedSize(s)}
                          className={`min-w-[44px] h-9 px-3 rounded-md text-xs font-medium border transition-all ${
                            isSelected
                              ? 'border-brand-gold bg-brand-gold/15 text-text font-semibold ring-1 ring-brand-gold'
                              : hasStock
                              ? 'border-border bg-surface text-text hover:border-brand-gold'
                              : 'border-border/40 bg-surface-alt/40 text-text-muted/40 cursor-not-allowed line-through'
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Stock Feedback */}
                <div className="mt-4 flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      isCurrentInStock
                        ? currentStock <= 5
                          ? 'bg-warning animate-pulse'
                          : 'bg-success'
                        : 'bg-danger'
                    }`}
                  />
                  <span className="text-xs font-medium text-text">
                    {isCurrentInStock
                      ? currentStock <= 5
                        ? `Hurry, only ${currentStock} left in stock!`
                        : 'In stock — ready to ship'
                      : 'Selected combination is currently out of stock'}
                  </span>
                </div>
              </div>

              {/* View Full Product link */}
              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                <Link
                  to={`/products/${product.slug}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand-crimson dark:text-brand-gold hover:underline"
                >
                  <span>View complete specifications</span>
                  <ChevronRight size={16} />
                </Link>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-text-muted hover:text-text"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
