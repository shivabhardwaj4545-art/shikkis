import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ChevronDown, ShieldCheck, Ruler, Truck } from 'lucide-react';
import { Product, ProductVariant } from '../../shared/types/index.ts';
import { useCartStore } from '../hooks/useCartStore.ts';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { Skeleton } from '../components/ui/Skeleton.tsx';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [activeAccordion, setActiveAccordion] = useState<'drape' | 'craft' | 'shipping' | null>('drape');
  const [isLoading, setIsLoading] = useState(true);

  const { addItem, setDrawerOpen } = useCartStore();

  useEffect(() => {
    async function fetchProduct() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/products/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setProduct(data.product);
          if (data.product.variants.length > 0) {
            setSelectedVariant(data.product.variants[0]);
          }
          if (data.product.images.length > 0) {
            setSelectedImage(data.product.images[0].imageUrl);
          }
        }
      } catch (err) {
        console.error('Failed to fetch product details:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (slug) fetchProduct();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-16 sm:px-24 py-48 grid grid-cols-1 md:grid-cols-2 gap-48">
        <Skeleton className="w-full aspect-[3/4]" />
        <div className="space-y-16">
          <Skeleton className="h-36 w-3/4" />
          <Skeleton className="h-24 w-1/2" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-64">
        <h2 className="font-serif text-28 font-bold text-text">Product Not Found</h2>
      </div>
    );
  }

  const formattedPrice = (product.pricePaise / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });

  const formattedDiscountPrice = product.discountPricePaise
    ? (product.discountPricePaise / 100).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      })
    : null;

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    addItem(product.id, selectedVariant.id, 1, {
      title: product.title,
      pricePaise: product.pricePaise,
      discountPricePaise: product.discountPricePaise,
      slug: product.slug,
      size: selectedVariant.size,
      color: selectedVariant.color,
      imageUrl: selectedImage,
    });
    setDrawerOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-16 sm:px-24 py-32 space-y-48">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-32 sm:gap-48 items-start">
        {/* Gallery Column */}
        <div className="space-y-16">
          <div className="aspect-[3/4] rounded-md overflow-hidden border border-border bg-surface-alt">
            <img src={selectedImage} alt={product.title} className="w-full h-full object-cover object-top" />
          </div>
          <div className="grid grid-cols-4 gap-12">
            {product.images.map((img) => (
              <button
                key={img.id}
                onClick={() => setSelectedImage(img.imageUrl)}
                className={`aspect-square rounded-sm overflow-hidden border ${
                  selectedImage === img.imageUrl ? 'border-brand-gold ring-2 ring-brand-gold' : 'border-border'
                }`}
              >
                <img src={img.imageUrl} alt={img.altText || product.title} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Details Column */}
        <div className="space-y-24">
          <div>
            <div className="flex items-center gap-8 mb-8">
              <Badge variant="gold">{product.categoryName}</Badge>
              {product.discountPricePaise && <Badge variant="crimson">Festive Pricing</Badge>}
            </div>
            <h1 className="font-serif text-32 sm:text-40 font-bold text-text leading-tight">{product.title}</h1>
            <p className="text-xs text-brand-gold font-semibold uppercase tracking-widest mt-4">
              Craft: {product.craft} • Fabric: {product.fabric}
            </p>
          </div>

          {/* Pricing */}
          <div className="flex items-baseline gap-12 pb-16 border-b border-border">
            {formattedDiscountPrice ? (
              <>
                <span className="font-serif text-32 font-bold text-brand-crimson dark:text-brand-gold">
                  {formattedDiscountPrice}
                </span>
                <span className="text-sm text-text-muted line-through">{formattedPrice}</span>
                <span className="text-xs text-success font-bold">(Inclusive of all taxes)</span>
              </>
            ) : (
              <span className="font-serif text-32 font-bold text-text">{formattedPrice}</span>
            )}
          </div>

          <p className="text-sm text-text-muted leading-relaxed">{product.description}</p>

          {/* Size Selector */}
          <div>
            <div className="flex items-center justify-between mb-8">
              <label className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-6">
                <Ruler className="w-14 h-14 text-brand-gold" /> Select Size
              </label>
              <a href="#size-guide" className="text-xs text-brand-gold hover:underline">
                View Size Guide
              </a>
            </div>
            <div className="flex flex-wrap gap-12">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  className={`min-h-[44px] min-w-[44px] px-16 py-10 text-xs font-bold rounded-sm border transition-colors ${
                    selectedVariant?.id === variant.id
                      ? 'bg-brand-crimson text-white border-brand-crimson'
                      : 'bg-surface text-text border-border hover:border-brand-gold'
                  }`}
                >
                  {variant.size}
                </button>
              ))}
            </div>
            {selectedVariant && (
              <p className="text-[11px] text-text-muted mt-8">
                Stock Available: <span className="font-bold text-text">{selectedVariant.stockQuantity} pieces</span> (SKU: {selectedVariant.sku})
              </p>
            )}
          </div>

          {/* Add to Bag Action */}
          <Button fullWidth size="lg" onClick={handleAddToCart} className="flex items-center justify-center gap-8">
            <ShoppingBag className="w-20 h-20" /> Add to Luxury Shopping Bag
          </Button>

          {/* Value Badges */}
          <div className="grid grid-cols-2 gap-12 py-16 border-y border-border text-xs text-text-muted">
            <div className="flex items-center gap-8">
              <ShieldCheck className="w-18 h-18 text-brand-gold" />
              <span>Certified Handloom Silk</span>
            </div>
            <div className="flex items-center gap-8">
              <Truck className="w-18 h-18 text-brand-gold" />
              <span>Free Insured Express Delivery</span>
            </div>
          </div>

          {/* Accordion Disclosures (height auto via Framer Motion layout) */}
          <div className="space-y-12">
            {/* Accordion item 1 */}
            <div className="border border-border rounded-sm overflow-hidden bg-surface">
              <button
                onClick={() => setActiveAccordion(activeAccordion === 'drape' ? null : 'drape')}
                className="w-full p-16 flex items-center justify-between text-left font-serif text-16 font-bold text-text min-h-[44px]"
              >
                Drape & Bespoke Fit Guidance
                <ChevronDown className={`w-18 h-18 transition-transform ${activeAccordion === 'drape' ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {activeAccordion === 'drape' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="p-16 border-t border-border text-xs text-text-muted space-y-8">
                      <p>• Saree Length: 5.5 meters with 0.8m unstitched raw silk blouse piece.</p>
                      <p>• Custom tailored stitching available upon order placement with our Jaipur atelier.</p>
                      <p>• Suits & Sherwanis feature 2-inch interior seam allowances for easy future resizing.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Accordion item 2 */}
            <div className="border border-border rounded-sm overflow-hidden bg-surface">
              <button
                onClick={() => setActiveAccordion(activeAccordion === 'craft' ? null : 'craft')}
                className="w-full p-16 flex items-center justify-between text-left font-serif text-16 font-bold text-text min-h-[44px]"
              >
                Artisan Provenance & Care Instructions
                <ChevronDown className={`w-18 h-18 transition-transform ${activeAccordion === 'craft' ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {activeAccordion === 'craft' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="p-16 border-t border-border text-xs text-text-muted space-y-8">
                      <p>• Handcrafted by certified Zardozi master weavers in Varanasi, UP.</p>
                      <p>• Dry Clean Only. Store in muslin cloth wrappers provided with your Shikkis keepsake box.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
