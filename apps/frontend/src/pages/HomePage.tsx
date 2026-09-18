import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { ProductCard } from '@/components/catalog/ProductCard';
import { QuickViewModal } from '@/components/catalog/QuickViewModal';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  api,
  type BannerItem,
  type CategoryItem,
  type OfferItem,
  type ProductItem,
} from '@/lib/api';
import { staggerContainer, staggerItem } from '@/lib/motion';

export const HomePage: React.FC = () => {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<ProductItem[]>([]);
  const [activeOffers, setActiveOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Hero carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const carouselRef = useRef<HTMLDivElement>(null);

  // Quick View modal state
  const [quickViewProduct, setQuickViewProduct] = useState<ProductItem | null>(null);

  // Fetch home page data
  useEffect(() => {
    let mounted = true;

    async function loadHomeData() {
      try {
        const [bannersRes, categoriesRes, productsRes, offersRes] = await Promise.all([
          api.getActiveBanners(),
          api.getCategories(),
          api.getProducts({ is_featured: true, limit: 8 }),
          api.getActiveOffers(),
        ]);

        if (mounted) {
          setBanners(bannersRes.data || []);
          setCategories(categoriesRes.data || []);
          setFeaturedProducts(productsRes.data || []);
          setActiveOffers(offersRes.data || []);
        }
      } catch (err) {
        console.error('Failed to load home page data:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadHomeData();
    return () => {
      mounted = false;
    };
  }, []);

  const totalSlides = banners.length;

  const nextSlide = useCallback(() => {
    if (totalSlides > 0) {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    if (totalSlides > 0) {
      setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
    }
  }, [totalSlides]);

  // 5s auto-advance: pauses on hover, on focus, and under reduced motion
  useEffect(() => {
    if (prefersReducedMotion || isPaused || totalSlides <= 1) return;

    const timer = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => clearInterval(timer);
  }, [isPaused, nextSlide, prefersReducedMotion, totalSlides]);

  // Keyboard navigation for carousel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only react if active element is inside carousel or on body
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide]);

  const currentBanner = banners[currentSlide];
  const primaryOffer = activeOffers[0];

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── 1. Hero Carousel (Full-bleed) ──────────────────────────────────── */}
      <section
        ref={carouselRef}
        aria-label="Promotional Highlights"
        className="relative w-full overflow-hidden bg-black aspect-[16/9] sm:aspect-[21/9] min-h-[460px] max-h-[680px]"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
      >
        {banners.length > 0 ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentBanner?.id || currentSlide}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.8, ease: 'easeInOut' }}
              className="absolute inset-0"
            >
              {/* Background Slide Image */}
              <img
                src={currentBanner?.image_url}
                alt={currentBanner?.title || 'Shikkis Luxury Wear'}
                className="h-full w-full object-cover object-center"
              />

              {/* Crimson to transparent gradient overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(155,27,48,0.88) 0%, rgba(155,27,48,0.55) 45%, rgba(0,0,0,0.2) 80%, transparent 100%)',
                }}
              />

              {/* Slide Content */}
              <div className="absolute inset-0 flex items-center">
                <div className="mx-auto w-full max-w-7xl px-6 md:px-12">
                  <div className="max-w-xl text-white space-y-4 drop-shadow-md">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-gold/30 px-3 py-1 text-xs font-semibold tracking-wider text-white uppercase backdrop-blur-md border border-brand-gold/50">
                      <Sparkles size={12} className="text-brand-gold" />
                      Curated Style
                    </span>

                    <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal leading-[1.1] tracking-tight">
                      {currentBanner?.title}
                    </h1>

                    {currentBanner?.subtitle && (
                      <p className="text-sm sm:text-base text-white/90 font-sans max-w-md leading-relaxed font-light">
                        {currentBanner.subtitle}
                      </p>
                    )}

                    <div className="pt-2">
                      <Link
                        to={currentBanner?.cta_link || '/catalog'}
                        className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-brand-crimson hover:bg-brand-gold hover:text-white transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
                      >
                        <span>{currentBanner?.cta_text || 'Shop Now'}</span>
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-alt">
            <Skeleton className="h-full w-full" />
          </div>
        )}

        {/* Arrow Controls */}
        {totalSlides > 1 && (
          <>
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Previous slide"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/20 backdrop-blur-sm transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next slide"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/20 backdrop-blur-sm transition-all"
            >
              <ChevronRight size={20} />
            </button>

            {/* Dot Indicators */}
            <div className="absolute bottom-5 inset-x-0 z-20 flex justify-center gap-2">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentSlide === idx ? 'w-8 bg-brand-gold' : 'w-2 bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── 2. Active Offer Banner with Gold Shimmer Sweep ──────────────────── */}
      {primaryOffer && (
        <section
          aria-label="Special Offer"
          className="gold-shimmer-sweep relative w-full bg-brand-crimson text-white py-3 px-4 border-y border-brand-gold/40 shadow-inner"
        >
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2 text-center text-xs sm:text-sm font-medium">
            <span className="font-semibold text-brand-gold">EXCLUSIVE FESTIVE OFFER:</span>
            <span>
              {primaryOffer.name} — Enjoy {primaryOffer.value}% off on curated handloom & bridal designs!
            </span>
            <Link
              to="/catalog"
              className="ml-2 font-bold underline underline-offset-4 hover:text-brand-gold transition-colors"
            >
              Shop Collection &rarr;
            </Link>
          </div>
        </section>
      )}

      {/* ── 3. Shop by Category Strip (Gold border reveal on hover) ─────────── */}
      <section aria-labelledby="shop-by-category-title" className="py-16 px-4 md:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-border">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-gold">
              Handpicked Collections
            </span>
            <h2 id="shop-by-category-title" className="font-serif text-3xl md:text-4xl text-text mt-1">
              Shop by Category
            </h2>
          </div>
          <Link
            to="/catalog"
            className="mt-2 sm:mt-0 text-xs font-semibold uppercase tracking-wider text-brand-crimson dark:text-brand-gold hover:underline flex items-center gap-1"
          >
            <span>View All Categories</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/catalog?category=${category.slug}`}
              className="group relative flex flex-col rounded-xl overflow-hidden bg-surface border border-border transition-all duration-300 hover:-translate-y-1 hover:border-brand-gold hover:shadow-lg"
            >
              {/* Category Image */}
              <div className="aspect-[4/5] w-full overflow-hidden bg-surface-alt">
                <img
                  src={category.image_url}
                  alt={category.name}
                  loading="lazy"
                  className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              {/* Category Card Footer */}
              <div className="p-3 text-center">
                <h3 className="text-sm font-semibold text-text group-hover:text-brand-crimson dark:group-hover:text-brand-gold transition-colors">
                  {category.name}
                </h3>
                <p className="text-[11px] text-text-muted mt-0.5">
                  {category.product_count} designs
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 4. Featured Products Grid (Staggered Entrance) ─────────────────── */}
      <section aria-labelledby="featured-products-title" className="py-12 px-4 md:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-border">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-gold">
              Artisan Masterpieces
            </span>
            <h2 id="featured-products-title" className="font-serif text-3xl md:text-4xl text-text mt-1">
              Featured Creations
            </h2>
          </div>
          <Link
            to="/catalog?sort=newest"
            className="mt-2 sm:mt-0 text-xs font-semibold uppercase tracking-wider text-brand-crimson dark:text-brand-gold hover:underline flex items-center gap-1"
          >
            <span>Explore Entire Catalog</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Responsive Grid with 2 / 3 / 4 columns */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[3/4] w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-4 w-1/3 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
          >
            {featuredProducts.map((product) => (
              <motion.div key={product.id} variants={staggerItem}>
                <ProductCard
                  product={product}
                  onQuickView={(p) => setQuickViewProduct(p)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* ── 5. Quick View Modal ────────────────────────────────────────────── */}
      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  );
};
