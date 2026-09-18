import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Eye } from 'lucide-react';
import { Product } from '../../../shared/types/index.ts';
import { useCartStore } from '../../hooks/useCartStore.ts';
import { useReducedMotion } from '../../hooks/useReducedMotion.ts';
import { Badge } from '../ui/Badge.tsx';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, index = 0 }) => {
  const { addItem } = useCartStore();
  const prefersReduced = useReducedMotion();

  const primaryImage = product.images.find((img) => img.isPrimary)?.imageUrl || product.images[0]?.imageUrl;

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

  // Staggered entrance capped at 8 items
  const staggerDelay = Math.min(index, 8) * 0.04;

  const cardVariants = prefersReduced
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : {
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0 },
      };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const defaultVariant = product.variants[0];
    if (defaultVariant) {
      addItem(product.id, defaultVariant.id, 1, {
        title: product.title,
        pricePaise: product.pricePaise,
        discountPricePaise: product.discountPricePaise,
        slug: product.slug,
        size: defaultVariant.size,
        color: defaultVariant.color,
        imageUrl: primaryImage,
      });
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.2, delay: staggerDelay, ease: [0.4, 0, 0.2, 1] }}
      className="group relative bg-surface border border-border rounded-md overflow-hidden flex flex-col justify-between transition-colors duration-200"
    >
      <Link to={`/products/${product.slug}`} className="block relative overflow-hidden aspect-[3/4] bg-surface-alt">
        {/* Hover scale 1.04 image (200ms) */}
        <motion.img
          src={primaryImage}
          alt={product.title}
          loading="lazy"
          className="w-full h-full object-cover object-top transition-transform duration-200 group-hover:scale-[1.04]"
        />

        {/* Badges */}
        <div className="absolute top-12 left-12 flex flex-col gap-4">
          {product.isFeatured && <Badge variant="gold">Featured Craft</Badge>}
          {product.discountPricePaise && <Badge variant="crimson">Festive Offer</Badge>}
        </div>

        {/* Quick View overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-12">
          <span className="bg-surface text-text p-12 rounded-full shadow-lg hover:scale-110 transition-transform">
            <Eye className="w-20 h-20" />
          </span>
        </div>
      </Link>

      {/* Content Metadata */}
      <div className="p-16 flex flex-col gap-8 flex-1 justify-between">
        <div>
          <span className="text-[10px] tracking-widest text-brand-gold uppercase font-semibold">
            {product.categoryName || 'Heritage Couture'} • {product.fabric}
          </span>
          <Link to={`/products/${product.slug}`} className="block">
            <h3 className="font-serif text-18 font-bold text-text line-clamp-1 hover:text-brand-gold transition-colors mt-2">
              {product.title}
            </h3>
          </Link>
          <p className="text-xs text-text-muted line-clamp-1 mt-4">{product.craft}</p>
        </div>

        {/* Price & Add to Bag */}
        <div className="pt-12 border-t border-border flex items-center justify-between mt-12">
          <div className="flex items-baseline gap-8">
            {formattedDiscountPrice ? (
              <>
                <span className="font-serif text-18 font-bold text-brand-crimson dark:text-brand-gold">
                  {formattedDiscountPrice}
                </span>
                <span className="text-xs text-text-muted line-through">{formattedPrice}</span>
              </>
            ) : (
              <span className="font-serif text-18 font-bold text-text">{formattedPrice}</span>
            )}
          </div>

          <button
            onClick={handleQuickAdd}
            className="p-10 text-brand-crimson dark:text-brand-gold hover:bg-brand-gold/10 rounded-sm transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Add default variant to bag"
            aria-label="Add to bag"
          >
            <ShoppingBag className="w-20 h-20" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
