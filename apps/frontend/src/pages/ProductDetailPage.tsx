import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  Heart,
  RotateCcw,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ImageGallery } from '@/components/catalog/ImageGallery';
import { Skeleton } from '@/components/ui/Skeleton';
import { api, type ProductDetail, type ProductVariant } from '@/lib/api';
import { formatDiscount, formatPrice } from '@/lib/format';
import { useCartStore } from '@/stores/cart.store';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const addItem = useCartStore((s) => s.addItem);
  const cartLoading = useCartStore((s) => s.loading);

  // Variant selection
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');

  // Accordion state
  const [openSection, setOpenSection] = useState<string | null>('fabric-care');

  // Fetch product detail
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    api
      .getProductBySlug(slug)
      .then((res) => {
        setProduct(res.data);
        // Pre-select first in-stock variant if available
        const inStockVar = res.data.variants.find((v) => v.stock > 0) || res.data.variants[0];
        if (inStockVar) {
          setSelectedSize(inStockVar.size);
          setSelectedColor(inStockVar.color);
        }
      })
      .catch((err) => {
        console.error('Failed to load product detail:', err);
        setError('The product you requested could not be found or has been discontinued.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  // Extract unique available sizes and colors
  const allSizes = useMemo(() => {
    if (!product) return [];
    return Array.from(new Set(product.variants.map((v) => v.size)));
  }, [product]);

  const allColors = useMemo(() => {
    if (!product) return [];
    return Array.from(new Set(product.variants.map((v) => v.color)));
  }, [product]);

  // Find variant matching current selection
  const matchedVariant: ProductVariant | undefined = useMemo(() => {
    if (!product) return undefined;
    return product.variants.find(
      (v) => v.size === selectedSize && v.color === selectedColor
    );
  }, [product, selectedSize, selectedColor]);

  const isMatchedInStock = matchedVariant ? matchedVariant.stock > 0 : false;
  const currentStock = matchedVariant?.stock ?? 0;

  // Schema.org JSON-LD structured data
  const jsonLdData = useMemo(() => {
    if (!product) return null;
    return {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: product.name,
      image: product.images,
      description: product.description,
      sku: product.sku,
      brand: {
        '@type': 'Brand',
        name: 'Shikkis',
      },
      offers: {
        '@type': 'Offer',
        url: window.location.href,
        priceCurrency: 'INR',
        price: (product.price.final_price_paise / 100).toFixed(2),
        priceValidUntil: '2026-12-31',
        availability:
          product.total_stock > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
      },
    };
  }, [product]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <Skeleton className="aspect-[3/4] w-full rounded-xl" />
          <div className="space-y-6">
            <Skeleton className="h-6 w-1/4 rounded" />
            <Skeleton className="h-10 w-3/4 rounded" />
            <Skeleton className="h-8 w-1/3 rounded" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-24 rounded" />
              <Skeleton className="h-10 w-24 rounded" />
            </div>
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-serif text-3xl font-semibold text-text mb-3">Product Not Found</h1>
        <p className="text-sm text-text-muted mb-6">{error}</p>
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-crimson px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-brand-crimson/90"
        >
          Return to Catalog
        </Link>
      </div>
    );
  }

  const toggleAccordion = (section: string) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  return (
    <>
      {/* ── Schema.org JSON-LD Structured Data ───────────────────────────── */}
      {jsonLdData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        />
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {/* ── Breadcrumbs ────────────────────────────────────────────────── */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-text-muted">
          <Link to="/" className="hover:text-text transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link to="/catalog" className="hover:text-text transition-colors">
            Catalog
          </Link>
          <span>/</span>
          <Link
            to={`/catalog?category=${product.category_slug}`}
            className="hover:text-text transition-colors"
          >
            {product.category_name}
          </Link>
          <span>/</span>
          <span className="truncate max-w-[200px] text-text font-medium">{product.name}</span>
        </nav>

        {/* ── Main Product Section ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          {/* Left Column: Image Gallery (7 cols) */}
          <div className="lg:col-span-7">
            <ImageGallery images={product.images} productName={product.name} />
          </div>

          {/* Right Column: Product Details & Variant Picker (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            {/* Category & SKU */}
            <div className="flex items-center justify-between text-xs text-text-muted mb-2">
              <span className="font-semibold uppercase tracking-widest text-brand-gold">
                {product.category_name}
              </span>
              <span>SKU: {product.sku}</span>
            </div>

            {/* Product Title */}
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-text font-normal leading-tight">
              {product.name}
            </h1>

            {/* Price Block */}
            <div className="mt-4 pb-5 border-b border-border">
              <div className="flex items-baseline gap-3">
                {/* Final price in crimson (gold on dark) */}
                <span className="font-serif text-3xl font-bold text-brand-crimson dark:text-brand-gold">
                  {formatPrice(product.price.final_price_paise)}
                </span>

                {/* Struck-through MRP */}
                {product.price.effective_discount_percent > 0 && (
                  <>
                    <span className="text-base text-text-muted line-through font-normal">
                      {formatPrice(product.price.mrp_paise)}
                    </span>
                    <span className="inline-flex items-center rounded-sm bg-brand-crimson/15 px-2 py-0.5 text-xs font-bold text-brand-crimson dark:text-brand-gold">
                      {formatDiscount(product.price.effective_discount_percent)}
                    </span>
                  </>
                )}
              </div>

              <span className="block mt-1 text-[11px] text-text-muted">
                Inclusive of all taxes. Free courier delivery within India.
              </span>

              {/* Active Auto-applied offer notice */}
              {product.price.applied_offer && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-brand-gold/15 px-3 py-1.5 text-xs font-semibold text-text border border-brand-gold/40">
                  <Sparkles size={14} className="text-brand-gold" />
                  <span>
                    Special Offer Applied: {product.price.applied_offer.name} (
                    {formatPrice(product.price.offer_discount_paise)} off)
                  </span>
                </div>
              )}
            </div>

            {/* ── Variant Pickers ──────────────────────────────────────────── */}
            <div className="py-5 space-y-5 border-b border-border">
              {/* Colour Selector */}
              <div>
                <div className="flex items-center justify-between mb-2 text-xs">
                  <span className="font-medium text-text">
                    Colour:{' '}
                    <strong className="text-brand-crimson dark:text-brand-gold font-semibold">
                      {selectedColor || 'Select Colour'}
                    </strong>
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {allColors.map((col) => {
                    // Check if this color has stock in ANY size
                    const hasStockInAnySize = product.variants.some(
                      (v) => v.color === col && v.stock > 0
                    );
                    const isSelected = selectedColor === col;

                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => {
                          if (hasStockInAnySize) {
                            setSelectedColor(col);
                          }
                        }}
                        disabled={!hasStockInAnySize}
                        className={`px-3.5 py-2 rounded-md text-xs font-medium border transition-all ${
                          isSelected
                            ? 'border-brand-crimson bg-brand-crimson text-white shadow-sm ring-1 ring-brand-crimson'
                            : hasStockInAnySize
                            ? 'border-border bg-surface text-text hover:border-brand-gold'
                            : 'border-border/30 bg-surface-alt/40 text-text-muted/40 cursor-not-allowed line-through'
                        }`}
                        title={!hasStockInAnySize ? `${col} is sold out` : col}
                      >
                        {col}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Size Selector */}
              <div>
                <div className="flex items-center justify-between mb-2 text-xs">
                  <span className="font-medium text-text">
                    Size:{' '}
                    <strong className="text-brand-crimson dark:text-brand-gold font-semibold">
                      {selectedSize || 'Select Size'}
                    </strong>
                  </span>
                  <span className="text-[11px] text-text-muted underline cursor-pointer">
                    Size Guide
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {allSizes.map((sz) => {
                    // Check if current combination (sz + selectedColor) exists and has stock
                    const matchingVariant = product.variants.find(
                      (v) => v.size === sz && v.color === selectedColor
                    );
                    const isAvailable = matchingVariant !== undefined;
                    const isInStock = matchingVariant ? matchingVariant.stock > 0 : false;
                    const isSelected = selectedSize === sz;

                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          // Prevent selecting out of stock variant
                          if (isInStock) {
                            setSelectedSize(sz);
                          }
                        }}
                        disabled={!isInStock}
                        className={`min-w-[48px] h-10 px-3 rounded-md text-xs font-medium border text-center transition-all ${
                          isSelected
                            ? 'border-brand-gold bg-brand-gold/15 text-text font-bold ring-2 ring-brand-gold'
                            : isInStock
                            ? 'border-border bg-surface text-text hover:border-brand-gold'
                            : 'border-border/30 bg-surface-alt/40 text-text-muted/40 cursor-not-allowed line-through'
                        }`}
                        title={
                          !isAvailable
                            ? 'Not available in this colour'
                            : !isInStock
                            ? 'Out of stock'
                            : sz
                        }
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Stock Feedback */}
              <div className="flex items-center gap-2 pt-1">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${
                    isMatchedInStock
                      ? currentStock <= 5
                        ? 'bg-warning animate-pulse'
                        : 'bg-success'
                      : 'bg-danger'
                  }`}
                />
                <span className="text-xs font-medium text-text">
                  {isMatchedInStock ? (
                    currentStock <= 5 ? (
                      <span className="text-warning font-semibold">
                        Hurry! Only {currentStock} piece{currentStock > 1 ? 's' : ''} left in stock.
                      </span>
                    ) : (
                      <span className="text-success">In Stock — Ready to ship in 24 hours.</span>
                    )
                  ) : (
                    <span className="text-danger font-semibold">
                      This size and colour combination is currently Out of Stock.
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* ── Action Buttons ───────────────────────────────────────────── */}
            <div className="py-6 space-y-3">
              <button
                type="button"
                id="add-to-bag-btn"
                disabled={!isMatchedInStock || cartLoading}
                onClick={async () => {
                  if (matchedVariant && isMatchedInStock) {
                    await addItem(matchedVariant.id, 1);
                  }
                }}
                className={`w-full flex items-center justify-center gap-2 rounded-lg py-3.5 px-6 font-semibold text-sm transition-all shadow-md active:scale-[0.99] ${
                  isMatchedInStock && !cartLoading
                    ? 'bg-brand-crimson hover:bg-brand-crimson/90 text-white cursor-pointer shadow-brand-crimson/20'
                    : 'bg-surface-alt text-text-muted/60 cursor-not-allowed border border-border'
                }`}
              >
                <ShoppingBag size={18} />
                <span>
                  {cartLoading
                    ? 'Adding...'
                    : isMatchedInStock
                    ? 'Add to Shopping Bag'
                    : 'Currently Unavailable'}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface py-2.5 px-4 text-xs font-medium text-text hover:border-brand-gold hover:text-brand-crimson dark:hover:text-brand-gold transition-colors"
                >
                  <Heart size={15} />
                  <span>Wishlist</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: product.name, url: window.location.href });
                    }
                  }}
                  className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface py-2.5 px-4 text-xs font-medium text-text hover:border-brand-gold hover:text-brand-crimson dark:hover:text-brand-gold transition-colors"
                >
                  <Share2 size={15} />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* ── Trust Highlights ─────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-2 py-4 border-y border-border text-center">
              <div className="flex flex-col items-center gap-1">
                <ShieldCheck size={18} className="text-brand-gold" />
                <span className="text-[11px] font-medium text-text">100% Authentic Handloom</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Truck size={18} className="text-brand-gold" />
                <span className="text-[11px] font-medium text-text">Complimentary Shipping</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <RotateCcw size={18} className="text-brand-gold" />
                <span className="text-[11px] font-medium text-text">Easy 7-Day Exchange</span>
              </div>
            </div>

            {/* ── Animated Accordion for Specifications ────────────────────── */}
            <div className="mt-4 divide-y divide-border">
              {/* Accordion 1: Fabric & Craft */}
              <div className="py-3">
                <button
                  type="button"
                  onClick={() => toggleAccordion('fabric-care')}
                  className="flex w-full items-center justify-between text-left text-xs font-semibold uppercase tracking-wider text-text hover:text-brand-crimson dark:hover:text-brand-gold transition-colors"
                >
                  <span>Fabric, Occasion & Details</span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${
                      openSection === 'fabric-care' ? 'rotate-180 text-brand-gold' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {openSection === 'fabric-care' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden pt-3 text-xs text-text-muted space-y-2.5 font-light"
                    >
                      <p className="leading-relaxed text-text font-normal">
                        {product.long_description || product.description}
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                        <div>
                          <strong className="text-text font-medium">Fabric:</strong> {product.fabric}
                        </div>
                        <div>
                          <strong className="text-text font-medium">Occasion:</strong>{' '}
                          {product.occasion}
                        </div>
                        <div>
                          <strong className="text-text font-medium">Gender:</strong> {product.gender}
                        </div>
                        <div>
                          <strong className="text-text font-medium">Origin:</strong> India
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Accordion 2: Care Instructions */}
              <div className="py-3">
                <button
                  type="button"
                  onClick={() => toggleAccordion('care')}
                  className="flex w-full items-center justify-between text-left text-xs font-semibold uppercase tracking-wider text-text hover:text-brand-crimson dark:hover:text-brand-gold transition-colors"
                >
                  <span>Care Instructions</span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${
                      openSection === 'care' ? 'rotate-180 text-brand-gold' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {openSection === 'care' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden pt-3 text-xs text-text-muted leading-relaxed"
                    >
                      <p>
                        {product.care_instructions ||
                          'Dry clean only. Store wrapped in pure cotton or muslin cloth in a dark, dry space. Refold handloom weaves periodically to preserve the delicate gold zari threads.'}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Accordion 3: Delivery & In-store Pickup */}
              <div className="py-3">
                <button
                  type="button"
                  onClick={() => toggleAccordion('shipping')}
                  className="flex w-full items-center justify-between text-left text-xs font-semibold uppercase tracking-wider text-text hover:text-brand-crimson dark:hover:text-brand-gold transition-colors"
                >
                  <span>Delivery & In-Store Pickup</span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${
                      openSection === 'shipping' ? 'rotate-180 text-brand-gold' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {openSection === 'shipping' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden pt-3 text-xs text-text-muted space-y-2 leading-relaxed"
                    >
                      <p>
                        <strong>Standard Courier:</strong> Dispatches within 24–48 hours. Delivered across India in 3–5 business days with tamper-proof security seals.
                      </p>
                      <p>
                        <strong>Boutique Pickup:</strong> Available same-day at our flagship store. Choose your preferred pickup window during checkout.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* ── Related Products Carousel / Grid ────────────────────────────── */}
        {product.related_products && product.related_products.length > 0 && (
          <section className="mt-20 pt-10 border-t border-border">
            <div className="mb-8">
              <span className="text-xs font-semibold uppercase tracking-widest text-brand-gold">
                Complementary Styles
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-text mt-1">
                You May Also Admire
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {product.related_products.map((rp: any) => (
                <Link
                  key={rp.id}
                  to={`/products/${rp.slug}`}
                  className="group flex flex-col rounded-lg border border-border bg-surface overflow-hidden hover:border-brand-gold transition-all duration-300 hover:shadow-md"
                >
                  <div className="aspect-[3/4] w-full overflow-hidden bg-surface-alt">
                    <img
                      src={rp.images[0] || '/placeholder.jpg'}
                      alt={rp.name}
                      loading="lazy"
                      className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3">
                    <span className="text-[11px] font-medium text-brand-gold uppercase tracking-wider">
                      {rp.category_name}
                    </span>
                    <h3 className="line-clamp-1 text-sm font-medium text-text mt-0.5 group-hover:text-brand-crimson dark:group-hover:text-brand-gold transition-colors">
                      {rp.name}
                    </h3>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-serif text-sm font-semibold text-brand-crimson dark:text-brand-gold">
                        {formatPrice(rp.price.final_price_paise)}
                      </span>
                      {rp.price.effective_discount_percent > 0 && (
                        <span className="text-[11px] text-text-muted line-through">
                          {formatPrice(rp.price.mrp_paise)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Sticky Add-to-Cart Bar on Mobile (Fixed at bottom) ────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border p-3 md:hidden shadow-lg">
        <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold text-text truncate">{product.name}</h4>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="font-serif text-sm font-bold text-brand-crimson dark:text-brand-gold">
                {formatPrice(product.price.final_price_paise)}
              </span>
              {product.price.effective_discount_percent > 0 && (
                <span className="text-[10px] text-text-muted line-through">
                  {formatPrice(product.price.mrp_paise)}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            id="mobile-add-to-bag-btn"
            disabled={!isMatchedInStock || cartLoading}
            onClick={async () => {
              if (matchedVariant && isMatchedInStock) {
                await addItem(matchedVariant.id, 1);
              }
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 px-4 text-xs font-semibold transition-all ${
              isMatchedInStock && !cartLoading
                ? 'bg-brand-crimson text-white shadow-md active:scale-95 cursor-pointer'
                : 'bg-surface-alt text-text-muted/60 border border-border cursor-not-allowed'
            }`}
          >
            <ShoppingBag size={14} />
            <span>
              {cartLoading ? 'Adding...' : isMatchedInStock ? 'Add to Bag' : 'Out of Stock'}
            </span>
          </button>
        </div>
      </div>
    </>
  );
};
