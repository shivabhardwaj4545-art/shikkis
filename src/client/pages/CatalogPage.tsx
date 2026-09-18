import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter } from 'lucide-react';
import { Product, Category } from '../../shared/types/index.ts';
import { ProductGrid } from '../components/catalog/ProductGrid.tsx';
import { FilterSidebar } from '../components/catalog/FilterSidebar.tsx';
import { Button } from '../components/ui/Button.tsx';

export const CatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const gender = searchParams.get('gender') || 'all';
  const categoryId = searchParams.get('categoryId') || '';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'newest';
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/products/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (gender && gender !== 'all') params.set('gender', gender);
        if (categoryId) params.set('categoryId', categoryId);
        if (search) params.set('search', search);
        if (sort) params.set('sort', sort);
        if (minPrice) params.set('minPricePaise', String(minPrice));
        if (maxPrice) params.set('maxPricePaise', String(maxPrice));

        const res = await fetch(`/api/products?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products);
        }
      } catch (err) {
        console.error('Failed to fetch catalog:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, [gender, categoryId, search, sort, minPrice, maxPrice]);

  const updateParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const handleReset = () => {
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-16 sm:px-24 py-32 space-y-24">
      {/* Page Heading & Mobile Filter Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-16 border-b border-border pb-16">
        <div>
          <h1 className="font-serif text-32 font-bold text-text uppercase tracking-wide">
            {gender === 'women' ? 'Women Couture' : gender === 'men' ? 'Men Heritage' : 'All Collections'}
          </h1>
          <p className="text-xs text-text-muted mt-4">
            Showing {products.length} handcrafted apparel pieces
          </p>
        </div>

        <div className="flex items-center gap-12">
          {/* Sort Selector */}
          <select
            value={sort}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="px-12 py-8 text-xs bg-surface border border-border rounded-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-gold min-h-[44px]"
          >
            <option value="newest">Sort by: Newest Arrivals</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="title">Title: A-Z</option>
          </select>

          {/* Mobile Filter Toggle Button (< 768px) */}
          <Button
            variant="outline"
            className="md:hidden flex items-center gap-6"
            onClick={() => setMobileFilterOpen(true)}
          >
            <Filter className="w-16 h-16" /> Filters
          </Button>
        </div>
      </div>

      {/* Main Catalog Layout */}
      <div className="flex gap-32">
        <FilterSidebar
          categories={categories}
          selectedGender={gender}
          selectedCategoryId={categoryId}
          minPricePaise={minPrice}
          maxPricePaise={maxPrice}
          searchQuery={search}
          onGenderChange={(g) => updateParam('gender', g)}
          onCategoryChange={(c) => updateParam('categoryId', c)}
          onPriceChange={(min, max) => {
            updateParam('minPrice', min ? String(min) : undefined);
            updateParam('maxPrice', max ? String(max) : undefined);
          }}
          onSearchChange={(q) => updateParam('search', q)}
          onReset={handleReset}
          isOpenMobile={mobileFilterOpen}
          onCloseMobile={() => setMobileFilterOpen(false)}
        />

        <div className="flex-1">
          <ProductGrid products={products} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};
