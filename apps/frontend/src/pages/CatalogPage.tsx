import { motion } from 'framer-motion';
import { ArrowUpDown, Filter, RotateCcw } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { FilterSidebar, type FilterState } from '@/components/catalog/FilterSidebar';
import { MobileFilterDrawer } from '@/components/catalog/MobileFilterDrawer';
import { ProductCard } from '@/components/catalog/ProductCard';
import { QuickViewModal } from '@/components/catalog/QuickViewModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { api, type CategoryItem, type ProductItem } from '@/lib/api';
import { staggerContainer, staggerItem } from '@/lib/motion';

const SORT_OPTIONS = [
  { label: 'Newest Arrivals', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Biggest Discount', value: 'discount_desc' },
];

export const CatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Mobile bottom sheet drawer state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Quick View modal state
  const [quickViewProduct, setQuickViewProduct] = useState<ProductItem | null>(null);

  // Extract filter values from URL search params
  const currentCategory = searchParams.get('category') || undefined;
  const currentGender = searchParams.get('gender') || undefined;
  const currentOccasion = searchParams.get('occasion') || undefined;
  const currentSort = searchParams.get('sort') || 'newest';
  const currentMinPrice = searchParams.get('min_price')
    ? parseInt(searchParams.get('min_price')!, 10)
    : undefined;
  const currentMaxPrice = searchParams.get('max_price')
    ? parseInt(searchParams.get('max_price')!, 10)
    : undefined;
  const currentMinDiscount = searchParams.get('min_discount')
    ? parseInt(searchParams.get('min_discount')!, 10)
    : undefined;
  const currentInStock = searchParams.get('in_stock') === 'true';

  const filters: FilterState = useMemo(
    () => ({
      category: currentCategory,
      gender: currentGender,
      occasion: currentOccasion,
      min_price: currentMinPrice,
      max_price: currentMaxPrice,
      min_discount: currentMinDiscount,
      in_stock: currentInStock,
    }),
    [
      currentCategory,
      currentGender,
      currentOccasion,
      currentMinPrice,
      currentMaxPrice,
      currentMinDiscount,
      currentInStock,
    ]
  );

  // Count active applied filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category) count++;
    if (filters.gender && filters.gender !== 'all') count++;
    if (filters.occasion) count++;
    if (filters.min_price || filters.max_price) count++;
    if (filters.min_discount) count++;
    if (filters.in_stock) count++;
    return count;
  }, [filters]);

  // Fetch categories list on mount
  useEffect(() => {
    api
      .getCategories()
      .then((res) => setCategories(res.data || []))
      .catch((err) => console.error('Failed to load categories:', err));
  }, []);

  // Fetch products whenever filters or sort change in the URL
  useEffect(() => {
    let active = true;
    setLoading(true);

    api
      .getProducts({
        category: filters.category,
        gender: filters.gender,
        occasion: filters.occasion,
        min_price: filters.min_price,
        max_price: filters.max_price,
        min_discount: filters.min_discount,
        in_stock: filters.in_stock,
        sort: currentSort,
        limit: 30, // Show generous catalog grid
      })
      .then((res) => {
        if (active) {
          setProducts(res.data || []);
          setTotalCount(res.pagination?.total || 0);
        }
      })
      .catch((err) => {
        if (active) {
          console.error('Failed to fetch products:', err);
          setProducts([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters, currentSort]);

  // Sync filter changes to URL search params (so back button works & URLs are shareable)
  const handleFilterChange = (newFilters: FilterState) => {
    const params = new URLSearchParams(searchParams);

    if (newFilters.category) params.set('category', newFilters.category);
    else params.delete('category');

    if (newFilters.gender && newFilters.gender !== 'all') params.set('gender', newFilters.gender);
    else params.delete('gender');

    if (newFilters.occasion) params.set('occasion', newFilters.occasion);
    else params.delete('occasion');

    if (newFilters.min_price !== undefined) params.set('min_price', String(newFilters.min_price));
    else params.delete('min_price');

    if (newFilters.max_price !== undefined) params.set('max_price', String(newFilters.max_price));
    else params.delete('max_price');

    if (newFilters.min_discount !== undefined)
      params.set('min_discount', String(newFilters.min_discount));
    else params.delete('min_discount');

    if (newFilters.in_stock) params.set('in_stock', 'true');
    else params.delete('in_stock');

    setSearchParams(params);
  };

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', newSort);
    setSearchParams(params);
  };

  const handleResetFilters = () => {
    const params = new URLSearchParams();
    if (currentSort !== 'newest') {
      params.set('sort', currentSort);
    }
    setSearchParams(params);
  };

  // Category page title heading
  const currentCategoryName = useMemo(() => {
    if (!filters.category) return 'All Creations';
    const found = categories.find((c) => c.slug === filters.category);
    return found ? found.name : 'Curated Styles';
  }, [categories, filters.category]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="mb-8 pb-6 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-widest text-brand-gold">
          Shikkis Collection
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-text mt-1">
          {currentCategoryName}
        </h1>
        <p className="mt-2 text-sm text-text-muted max-w-2xl font-light">
          Immerse yourself in authentic Indian artisan craftsmanship, handwoven silks, and modern silhouettes.
        </p>
      </div>

      {/* ── Toolbar: Filter Button (Mobile) + Results Count + Sort Dropdown ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Mobile Filter Trigger (<768px) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="md:hidden flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-xs font-medium text-text shadow-sm hover:border-brand-gold transition-colors"
          >
            <Filter size={15} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-crimson text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <span className="text-xs text-text-muted">
            Showing <strong className="font-semibold text-text">{products.length}</strong> of{' '}
            <strong className="font-semibold text-text">{totalCount}</strong> items
          </span>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-xs font-medium text-text-muted hidden sm:block">
            Sort by:
          </label>
          <div className="relative">
            <select
              id="sort-select"
              value={currentSort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="appearance-none rounded-lg border border-border bg-surface pl-3 pr-8 py-2 text-xs font-medium text-text shadow-sm focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-colors cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ArrowUpDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted"
            />
          </div>
        </div>
      </div>

      {/* ── Main Catalog Layout: Sidebar + Grid ───────────────────────────── */}
      <div className="flex gap-8">
        {/* Desktop Filter Sidebar (>768px) */}
        <div className="hidden md:block">
          <FilterSidebar
            categories={categories}
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
            activeFilterCount={activeFilterCount}
          />
        </div>

        {/* Product Grid Area */}
        <main className="flex-1 min-w-0">
          {/* Skeleton Cards on Loading (Never a spinner) */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="space-y-3 rounded-lg border border-border bg-surface p-3">
                  <Skeleton className="aspect-[3/4] w-full rounded-md" />
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                  <div className="pt-2 flex justify-between">
                    <Skeleton className="h-5 w-20 rounded" />
                    <Skeleton className="h-4 w-12 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            /* Empty State with reset suggestion */
            <div className="py-16 text-center rounded-xl border border-dashed border-border bg-surface/40 p-8">
              <EmptyState
                title="No products match your selected criteria"
                description="Try broadening your filters or resetting to view all available collections."
                action={
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-crimson px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-brand-crimson/90 active:scale-[0.98] transition-all"
                  >
                    <RotateCcw size={14} />
                    <span>Clear all filters</span>
                  </button>
                }
              />
            </div>
          ) : (
            /* Responsive Product Grid */
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6"
            >
              {products.map((product) => (
                <motion.div key={product.id} variants={staggerItem}>
                  <ProductCard
                    product={product}
                    onQuickView={(p) => setQuickViewProduct(p)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </main>
      </div>

      {/* ── Mobile Filter Drawer (<768px) ─────────────────────────────────── */}
      <MobileFilterDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        categories={categories}
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        activeFilterCount={activeFilterCount}
        totalProductsCount={totalCount}
      />

      {/* ── Quick View Modal ──────────────────────────────────────────────── */}
      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  );
};
