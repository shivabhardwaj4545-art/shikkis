import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw, X } from 'lucide-react';
import React from 'react';

import type { CategoryItem } from '@/lib/api';
import type { FilterState } from './FilterSidebar';

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onReset: () => void;
  activeFilterCount: number;
  totalProductsCount: number;
}

const GENDERS = [
  { label: 'All', value: 'all' },
  { label: 'Women', value: 'women' },
  { label: 'Men', value: 'men' },
  { label: 'Unisex', value: 'unisex' },
];

const OCCASIONS = [
  'Bridal & Festive',
  'Weddings',
  'Cocktail & Party',
  'Sangeet & Mehendi',
  'Haldi',
  'Casual & Office',
];

const PRICE_RANGES = [
  { label: 'Under ₹5,000', min: undefined, max: 500000 },
  { label: '₹5k – ₹15k', min: 500000, max: 1500000 },
  { label: '₹15k – ₹35k', min: 1500000, max: 3500000 },
  { label: 'Above ₹35k', min: 3500000, max: undefined },
];

const DISCOUNT_RANGES = [
  { label: '10%+', value: 10 },
  { label: '15%+', value: 15 },
  { label: '20%+', value: 20 },
];

export const MobileFilterDrawer: React.FC<MobileFilterDrawerProps> = ({
  isOpen,
  onClose,
  categories,
  filters,
  onFilterChange,
  onReset,
  activeFilterCount,
  totalProductsCount,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full rounded-t-2xl border-t border-border bg-surface shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
          >
            {/* Sheet Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1.5 w-12 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-text">Refine Results</h2>
                {activeFilterCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-crimson text-[11px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={onReset}
                    className="flex items-center gap-1 text-xs font-medium text-brand-crimson dark:text-brand-gold"
                  >
                    <RotateCcw size={12} />
                    <span>Reset</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-alt text-text-muted hover:text-text"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Scrollable Filter Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {/* In-Stock Toggle */}
              <label className="flex items-center justify-between cursor-pointer py-1">
                <span className="text-sm font-medium text-text">In-Stock Only</span>
                <input
                  type="checkbox"
                  checked={Boolean(filters.in_stock)}
                  onChange={(e) => onFilterChange({ ...filters, in_stock: e.target.checked })}
                  className="h-5 w-5 rounded border-border text-brand-crimson focus:ring-brand-crimson/20"
                />
              </label>

              {/* Gender */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2.5">
                  Gender
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {GENDERS.map((g) => {
                    const isSelected =
                      (g.value === 'all' && !filters.gender) || filters.gender === g.value;
                    return (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() =>
                          onFilterChange({
                            ...filters,
                            gender: g.value === 'all' ? undefined : g.value,
                          })
                        }
                        className={`py-2 px-1 rounded-md text-xs font-medium border text-center transition-all ${
                          isSelected
                            ? 'border-brand-crimson bg-brand-crimson text-white shadow-sm'
                            : 'border-border bg-surface-alt text-text'
                        }`}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Categories */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2.5">
                  Categories
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onFilterChange({ ...filters, category: undefined })}
                    className={`py-1.5 px-3 rounded-md text-xs font-medium border transition-all ${
                      !filters.category
                        ? 'border-brand-crimson bg-brand-crimson text-white'
                        : 'border-border bg-surface-alt text-text'
                    }`}
                  >
                    All
                  </button>
                  {categories.map((c) => {
                    const isSelected = filters.category === c.slug;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() =>
                          onFilterChange({
                            ...filters,
                            category: isSelected ? undefined : c.slug,
                          })
                        }
                        className={`py-1.5 px-3 rounded-md text-xs font-medium border transition-all ${
                          isSelected
                            ? 'border-brand-crimson bg-brand-crimson text-white'
                            : 'border-border bg-surface-alt text-text'
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2.5">
                  Price
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {PRICE_RANGES.map((pr, idx) => {
                    const isSelected =
                      filters.min_price === pr.min && filters.max_price === pr.max;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          onFilterChange({
                            ...filters,
                            min_price: isSelected ? undefined : pr.min,
                            max_price: isSelected ? undefined : pr.max,
                          })
                        }
                        className={`py-2 px-2.5 rounded-md text-xs font-medium border text-left transition-all ${
                          isSelected
                            ? 'border-brand-gold bg-brand-gold/15 text-brand-crimson dark:text-brand-gold font-semibold'
                            : 'border-border bg-surface-alt text-text'
                        }`}
                      >
                        {pr.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Occasions */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2.5">
                  Occasion
                </h3>
                <div className="flex flex-wrap gap-2">
                  {OCCASIONS.map((occ) => {
                    const isSelected = filters.occasion === occ;
                    return (
                      <button
                        key={occ}
                        type="button"
                        onClick={() =>
                          onFilterChange({
                            ...filters,
                            occasion: isSelected ? undefined : occ,
                          })
                        }
                        className={`py-1.5 px-3 rounded-md text-xs font-medium border transition-all ${
                          isSelected
                            ? 'border-brand-crimson bg-brand-crimson text-white'
                            : 'border-border bg-surface-alt text-text'
                        }`}
                      >
                        {occ}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Discounts */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2.5">
                  Minimum Discount
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {DISCOUNT_RANGES.map((d) => {
                    const isSelected = filters.min_discount === d.value;
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() =>
                          onFilterChange({
                            ...filters,
                            min_discount: isSelected ? undefined : d.value,
                          })
                        }
                        className={`py-2 rounded-md text-xs font-medium border text-center transition-all ${
                          isSelected
                            ? 'border-brand-crimson bg-brand-crimson text-white font-semibold'
                            : 'border-border bg-surface-alt text-text'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer Action */}
            <div className="p-4 border-t border-border bg-surface">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-lg bg-brand-crimson text-white font-medium text-sm shadow-md hover:bg-brand-crimson/90 active:scale-[0.99] transition-all"
              >
                View {totalProductsCount} Products
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
