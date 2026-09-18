import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import React from 'react';

import type { CategoryItem } from '@/lib/api';

export interface FilterState {
  category?: string | undefined;
  gender?: string | undefined;
  occasion?: string | undefined;
  min_price?: number | undefined;
  max_price?: number | undefined;
  min_discount?: number | undefined;
  in_stock?: boolean | undefined;
}

interface FilterSidebarProps {
  categories: CategoryItem[];
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onReset: () => void;
  activeFilterCount: number;
}

const GENDERS = [
  { label: 'All Genders', value: 'all' },
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
  { label: '₹5,000 – ₹15,000', min: 500000, max: 1500000 },
  { label: '₹15,000 – ₹35,000', min: 1500000, max: 3500000 },
  { label: 'Above ₹35,000', min: 3500000, max: undefined },
];

const DISCOUNT_RANGES = [
  { label: '10% and above', value: 10 },
  { label: '15% and above', value: 15 },
  { label: '20% and above', value: 20 },
];

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  categories,
  filters,
  onFilterChange,
  onReset,
  activeFilterCount,
}) => {
  return (
    <aside className="w-64 flex-shrink-0 space-y-6">
      {/* Header with active count & Reset button */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-text" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text">Filters</h2>
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-crimson text-[11px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </div>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-xs font-medium text-brand-crimson dark:text-brand-gold hover:underline"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* In-Stock Toggle */}
      <div className="pb-4 border-b border-border">
        <label className="flex items-center justify-between cursor-pointer group">
          <span className="text-sm font-medium text-text group-hover:text-brand-crimson dark:group-hover:text-brand-gold transition-colors">
            In-Stock Only
          </span>
          <input
            type="checkbox"
            checked={Boolean(filters.in_stock)}
            onChange={(e) => onFilterChange({ ...filters, in_stock: e.target.checked })}
            className="h-4 w-4 rounded border-border text-brand-crimson focus:ring-brand-crimson/20"
          />
        </label>
      </div>

      {/* Categories */}
      <div className="pb-5 border-b border-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
          Categories
        </h3>
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, category: undefined })}
            className={`flex w-full items-center justify-between py-1.5 px-2 rounded-md text-xs transition-colors ${
              !filters.category
                ? 'bg-brand-crimson/10 text-brand-crimson dark:text-brand-gold font-semibold'
                : 'text-text hover:bg-surface-alt'
            }`}
          >
            <span>All Categories</span>
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
                className={`flex w-full items-center justify-between py-1.5 px-2 rounded-md text-xs transition-colors ${
                  isSelected
                    ? 'bg-brand-crimson/10 text-brand-crimson dark:text-brand-gold font-semibold'
                    : 'text-text hover:bg-surface-alt'
                }`}
              >
                <span>{c.name}</span>
                <span className="text-[11px] text-text-muted">({c.product_count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Gender */}
      <div className="pb-5 border-b border-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
          Gender
        </h3>
        <div className="flex flex-wrap gap-1.5">
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
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                  isSelected
                    ? 'border-brand-crimson bg-brand-crimson text-white shadow-sm'
                    : 'border-border bg-surface text-text hover:border-brand-gold'
                }`}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range */}
      <div className="pb-5 border-b border-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
          Price Range
        </h3>
        <div className="space-y-1.5">
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
                className={`flex w-full items-center justify-between py-1.5 px-2 rounded-md text-xs transition-colors ${
                  isSelected
                    ? 'bg-brand-gold/15 text-brand-crimson dark:text-brand-gold font-semibold'
                    : 'text-text hover:bg-surface-alt'
                }`}
              >
                <span>{pr.label}</span>
                {isSelected && <span className="text-brand-gold font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Occasion */}
      <div className="pb-5 border-b border-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
          Occasion
        </h3>
        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
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
                className={`flex w-full items-center justify-between py-1.5 px-2 rounded-md text-xs transition-colors ${
                  isSelected
                    ? 'bg-brand-crimson/10 text-brand-crimson dark:text-brand-gold font-semibold'
                    : 'text-text hover:bg-surface-alt'
                }`}
              >
                <span>{occ}</span>
                {isSelected && <span className="text-brand-crimson dark:text-brand-gold font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Minimum Discount */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
          Discounts
        </h3>
        <div className="space-y-1">
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
                className={`flex w-full items-center justify-between py-1.5 px-2 rounded-md text-xs transition-colors ${
                  isSelected
                    ? 'bg-brand-crimson/10 text-brand-crimson dark:text-brand-gold font-semibold'
                    : 'text-text hover:bg-surface-alt'
                }`}
              >
                <span>{d.label}</span>
                {isSelected && <span className="text-brand-crimson dark:text-brand-gold font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
