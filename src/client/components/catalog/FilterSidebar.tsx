import React from 'react';
import { Filter, X, RefreshCw } from 'lucide-react';
import { Category } from '../../../shared/types/index.ts';
import { Button } from '../ui/Button.tsx';

interface FilterSidebarProps {
  categories: Category[];
  selectedGender: string;
  selectedCategoryId: string;
  minPricePaise: number | undefined;
  maxPricePaise: number | undefined;
  searchQuery: string;
  onGenderChange: (gender: string) => void;
  onCategoryChange: (catId: string) => void;
  onPriceChange: (min: number | undefined, max: number | undefined) => void;
  onSearchChange: (query: string) => void;
  onReset: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  categories,
  selectedGender,
  selectedCategoryId,
  minPricePaise,
  maxPricePaise,
  searchQuery,
  onGenderChange,
  onCategoryChange,
  onPriceChange,
  onSearchChange,
  onReset,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const filterContent = (
    <div className="space-y-24">
      {/* Header */}
      <div className="flex items-center justify-between pb-12 border-b border-border">
        <h3 className="font-serif text-20 font-bold text-text flex items-center gap-8">
          <Filter className="w-18 h-18 text-brand-gold" /> Refine Couture
        </h3>
        <button
          onClick={onReset}
          className="text-xs text-text-muted hover:text-brand-gold flex items-center gap-4 min-h-[44px]"
        >
          <RefreshCw className="w-12 h-12" /> Reset
        </button>
      </div>

      {/* Search Input */}
      <div>
        <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-8">
          Search Craft / Fabric
        </label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="e.g. Banarasi, Zardozi, Silk..."
          className="w-full px-12 py-10 text-sm bg-surface border border-border rounded-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-gold min-h-[44px]"
        />
      </div>

      {/* Gender Filter */}
      <div>
        <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-8">
          Department
        </label>
        <div className="flex flex-wrap gap-8">
          {[
            { id: 'all', label: 'All' },
            { id: 'women', label: 'Women Couture' },
            { id: 'men', label: 'Men Heritage' },
          ].map((g) => (
            <button
              key={g.id}
              onClick={() => onGenderChange(g.id)}
              className={`px-12 py-8 text-xs font-medium rounded-sm border min-h-[44px] transition-colors ${
                selectedGender === g.id
                  ? 'bg-brand-crimson text-white border-brand-crimson'
                  : 'bg-surface text-text border-border hover:border-brand-gold'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div>
        <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-8">
          Category
        </label>
        <div className="space-y-4 max-h-64 overflow-y-auto pr-4">
          <button
            onClick={() => onCategoryChange('')}
            className={`w-full text-left text-xs py-8 px-8 rounded-sm min-h-[44px] flex items-center ${
              !selectedCategoryId ? 'font-bold text-brand-gold bg-brand-gold/10' : 'text-text hover:bg-surface-alt/50'
            }`}
          >
            All Categories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => onCategoryChange(c.id)}
              className={`w-full text-left text-xs py-8 px-8 rounded-sm min-h-[44px] flex items-center ${
                selectedCategoryId === c.id ? 'font-bold text-brand-gold bg-brand-gold/10' : 'text-text hover:bg-surface-alt/50'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range Filter */}
      <div>
        <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-8">
          Price Range (₹ INR)
        </label>
        <div className="grid grid-cols-2 gap-12">
          <div>
            <span className="text-[10px] text-text-muted">Min Price</span>
            <input
              type="number"
              value={minPricePaise ? minPricePaise / 100 : ''}
              onChange={(e) =>
                onPriceChange(e.target.value ? Number(e.target.value) * 100 : undefined, maxPricePaise)
              }
              placeholder="0"
              className="w-full px-10 py-8 text-sm bg-surface border border-border rounded-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-gold min-h-[44px]"
            />
          </div>
          <div>
            <span className="text-[10px] text-text-muted">Max Price</span>
            <input
              type="number"
              value={maxPricePaise ? maxPricePaise / 100 : ''}
              onChange={(e) =>
                onPriceChange(minPricePaise, e.target.value ? Number(e.target.value) * 100 : undefined)
              }
              placeholder="50000"
              className="w-full px-10 py-8 text-sm bg-surface border border-border rounded-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-gold min-h-[44px]"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Left Sidebar (>= 768px) */}
      <aside className="hidden md:block w-64 shrink-0 bg-surface border border-border p-20 rounded-md h-fit">
        {filterContent}
      </aside>

      {/* Mobile Bottom Sheet / Drawer (< 768px) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onCloseMobile} />
          <div className="relative z-10 bg-surface border-t border-border p-24 rounded-t-xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-12 mb-16 border-b border-border">
              <h3 className="font-serif text-20 font-bold text-text">Filters</h3>
              <button
                onClick={onCloseMobile}
                className="p-8 text-text-muted hover:text-text rounded-sm min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-20 h-20" />
              </button>
            </div>
            {filterContent}
            <div className="mt-24 pt-16 border-t border-border">
              <Button fullWidth onClick={onCloseMobile}>
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
