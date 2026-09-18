import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, ShoppingBag, Sparkles, Tag, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatPrice } from '@/lib/format';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { useCartStore } from '@/stores/cart.store';

export const CartDrawer: React.FC = () => {
  const {
    isOpen,
    closeDrawer,
    breakdown,
    updateQuantity,
    removeItem,
    applyCoupon,
    removeCoupon,
    fetchCart,
  } = useCartStore();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponApplying, setCouponApplying] = useState(false);

  const drawerRef = useFocusTrap<HTMLDivElement>({
    isOpen,
    onClose: closeDrawer,
    autoFocusFirst: false,
  });
  const navigate = useNavigate();

  // Load cart on initial mount
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setCouponApplying(true);
    setCouponError(null);

    const res = await applyCoupon(couponInput.trim());
    setCouponApplying(false);

    if (res.success) {
      setCouponInput('');
    } else {
      setCouponError(res.error || 'Failed to apply coupon');
    }
  };

  const handleCheckout = () => {
    closeDrawer();
    navigate('/checkout');
  };

  const items = breakdown?.items || [];
  const itemCount = items.reduce((acc, it) => acc + it.quantity, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop Fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeDrawer}
            aria-hidden="true"
          />

          {/* Drawer: Spring slide-in from right. Fullscreen below 640px. */}
          <motion.div
            ref={drawerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Shopping Bag"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative z-10 w-full sm:max-w-md md:max-w-lg bg-surface border-l border-border shadow-2xl flex flex-col h-full focus:outline-none"
          >
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-brand-crimson dark:text-brand-gold" />
                <h2 className="font-serif text-lg font-semibold text-text">Your Shopping Bag</h2>
                {itemCount > 0 && (
                  <span className="flex h-5 px-2 items-center justify-center rounded-full bg-brand-crimson text-[11px] font-bold text-white">
                    {itemCount}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={closeDrawer}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full border border-border text-text-muted hover:text-text hover:border-brand-gold transition-colors"
                aria-label="Close shopping bag"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Body: Item Rows or Empty State ─────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                /* Empty State with Gold Ornament */
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-gold/15 border border-brand-gold/40 text-brand-gold">
                    <Sparkles size={32} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-serif text-xl font-semibold text-text">Your Bag is Empty</h3>
                    <p className="text-xs text-text-muted max-w-xs leading-relaxed font-light">
                      Explore our handloom sarees, bespoke lehengas, and royal heritage drapes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      closeDrawer();
                      navigate('/catalog');
                    }}
                    className="mt-2 inline-flex items-center justify-center rounded-lg bg-brand-crimson px-6 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-brand-crimson/90 active:scale-[0.98] transition-all"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                /* Cart Items List with AnimatePresence & layout reflow */
                <motion.ul layout className="divide-y divide-border/60">
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <motion.li
                        key={item.variant_id}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                        transition={{ duration: 0.25 }}
                        className="py-4 flex gap-4 overflow-hidden"
                      >
                        {/* Thumbnail */}
                        <div className="h-20 w-16 flex-shrink-0 overflow-hidden rounded-md border border-border bg-surface-alt">
                          <img
                            src={item.image_url}
                            alt={item.product_name}
                            className="h-full w-full object-cover object-top"
                          />
                        </div>

                        {/* Item Details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-xs font-medium text-text truncate">
                                {item.product_name}
                              </h4>
                              <button
                                type="button"
                                onClick={() => removeItem(item.variant_id)}
                                className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center text-text-muted hover:text-danger transition-colors"
                                aria-label={`Remove ${item.product_name} from bag`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            <p className="text-[11px] text-text-muted mt-0.5">
                              Size: <strong className="text-text">{item.size}</strong> | Colour:{' '}
                              <strong className="text-text">{item.color}</strong>
                            </p>
                          </div>

                          {/* Price & Quantity Stepper */}
                          <div className="flex items-center justify-between mt-2">
                            {/* Quantity Stepper */}
                            <div className="flex items-center rounded-md border border-border bg-surface shadow-sm">
                              <button
                                type="button"
                                disabled={item.quantity <= 1}
                                onClick={() => updateQuantity(item.variant_id, item.quantity - 1)}
                                className="min-h-[36px] min-w-[36px] flex items-center justify-center text-text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                aria-label="Decrease quantity"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-8 text-center text-xs font-semibold text-text">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                disabled={item.quantity >= item.stock}
                                onClick={() => updateQuantity(item.variant_id, item.quantity + 1)}
                                className="min-h-[36px] min-w-[36px] flex items-center justify-center text-text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                aria-label="Increase quantity"
                              >
                                <Plus size={14} />
                              </button>
                            </div>

                            {/* Line Total Price */}
                            <div className="text-right">
                              <span className="font-serif text-sm font-semibold text-brand-crimson dark:text-brand-gold">
                                {formatPrice(item.unit_final_price_paise * item.quantity)}
                              </span>
                              {item.line_mrp_paise > item.unit_final_price_paise * item.quantity && (
                                <span className="block text-[10px] text-text-muted line-through">
                                  {formatPrice(item.line_mrp_paise)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </motion.ul>
              )}
            </div>

            {/* ── Footer: Promo Code & Breakdown ─────────────────────────── */}
            {items.length > 0 && breakdown && (
              <div className="border-t border-border bg-surface-alt/40 p-6 space-y-4">
                {/* Promo Code Input */}
                {breakdown.coupon ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-brand-gold/15 border border-brand-gold/40 text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-text">
                      <Tag size={13} className="text-brand-gold" />
                      <span>
                        Coupon <strong>{breakdown.coupon.code}</strong> applied
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-text-muted hover:text-danger text-xs font-semibold underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value);
                          if (couponError) setCouponError(null);
                        }}
                        placeholder="Promotional code (e.g. ROYAL2000)"
                        className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-xs text-text placeholder:text-text-muted focus:border-brand-gold focus:ring-1 focus:ring-brand-gold uppercase"
                      />
                      <button
                        type="submit"
                        disabled={couponApplying || !couponInput.trim()}
                        className="px-4 py-2 rounded-md bg-surface text-xs font-semibold text-text border border-border hover:border-brand-gold hover:text-brand-crimson dark:hover:text-brand-gold disabled:opacity-40 transition-colors"
                      >
                        {couponApplying ? '...' : 'Apply'}
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-[11px] text-danger font-medium">{couponError}</p>
                    )}
                  </form>
                )}

                {/* Detailed Breakdown */}
                <div className="space-y-2 text-xs pt-2 border-t border-border/60">
                  <div className="flex justify-between text-text-muted">
                    <span>Subtotal (MRP)</span>
                    <span>{formatPrice(breakdown.subtotal_mrp_paise)}</span>
                  </div>

                  {/* Each named discount on its own line */}
                  {breakdown.discounts.map((disc, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-brand-crimson dark:text-brand-gold font-medium"
                    >
                      <span className="truncate max-w-[240px]">
                        ✨ {disc.name} {disc.code ? `(${disc.code})` : ''}
                      </span>
                      <span>-{formatPrice(disc.discount_paise)}</span>
                    </div>
                  ))}

                  <div className="flex justify-between text-text-muted">
                    <span>Estimated Shipping</span>
                    <span>
                      {breakdown.shipping_paise === 0 ? (
                        <strong className="text-success font-semibold uppercase">Free</strong>
                      ) : (
                        formatPrice(breakdown.shipping_paise)
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between text-text-muted">
                    <span>GST (5%)</span>
                    <span>{formatPrice(breakdown.tax_paise)}</span>
                  </div>

                  <div className="flex justify-between text-sm font-semibold text-text pt-2 border-t border-border">
                    <span>Estimated Total</span>
                    <span className="font-serif text-base font-bold text-brand-crimson dark:text-brand-gold">
                      {formatPrice(breakdown.total_paise)}
                    </span>
                  </div>
                </div>

                {/* Checkout CTA */}
                <button
                  type="button"
                  onClick={handleCheckout}
                  className="w-full py-3.5 rounded-lg bg-brand-crimson text-white font-semibold text-sm shadow-md hover:bg-brand-crimson/90 active:scale-[0.99] transition-all"
                >
                  Proceed to Checkout &rarr;
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
