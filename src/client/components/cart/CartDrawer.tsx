import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCartStore } from '../../hooks/useCartStore.ts';
import { Drawer } from '../ui/Drawer.tsx';
import { Button } from '../ui/Button.tsx';

export const CartDrawer: React.FC = () => {
  const { items, isDrawerOpen, setDrawerOpen, updateQuantity, removeItem, totalPaise } = useCartStore();
  const navigate = useNavigate();

  const handleCheckout = () => {
    setDrawerOpen(false);
    navigate('/checkout');
  };

  const subtotalFormatted = (totalPaise() / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });

  return (
    <Drawer isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} title="Luxury Shopping Bag">
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full py-48 text-center space-y-16">
          <ShoppingBag className="w-48 h-48 text-brand-gold opacity-60" />
          <h4 className="font-serif text-20 font-bold text-text">Your Bag is Empty</h4>
          <p className="text-xs text-text-muted max-w-xs">
            Discover our curated handloom sarees, bespoke sherwanis, and fusion bridal couture.
          </p>
          <Button onClick={() => { setDrawerOpen(false); navigate('/catalog'); }}>
            Explore Couture
          </Button>
        </div>
      ) : (
        <div className="flex flex-col h-full justify-between">
          <div className="space-y-16 overflow-y-auto pr-4 flex-1">
            {items.map((item) => {
              const itemPrice = (item.discountPricePaise || item.pricePaise) / 100;
              const formattedItemPrice = itemPrice.toLocaleString('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0,
              });

              return (
                <div key={item.id} className="flex gap-16 p-12 bg-surface-alt/30 border border-border rounded-md">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-20 h-28 object-cover rounded-sm shrink-0"
                    />
                  )}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-serif text-16 font-bold text-text line-clamp-1">{item.title}</h4>
                      <p className="text-xs text-text-muted mt-2">
                        Size: <span className="font-semibold text-text">{item.size}</span> | Color: <span className="font-semibold text-text">{item.color}</span>
                      </p>
                      <p className="text-sm font-serif font-bold text-brand-crimson dark:text-brand-gold mt-4">
                        {formattedItemPrice}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-8">
                      {/* Quantity Controls */}
                      <div className="flex items-center border border-border rounded-sm bg-surface">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-6 text-text hover:text-brand-gold min-h-[44px] min-w-[44px] flex items-center justify-center"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-14 h-14" />
                        </button>
                        <span className="px-12 text-xs font-bold text-text">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-6 text-text hover:text-brand-gold min-h-[44px] min-w-[44px] flex items-center justify-center"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-14 h-14" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-6 text-danger hover:opacity-80 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-16 h-16" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Subtotal & Checkout Button */}
          <div className="pt-16 border-t border-border mt-16 space-y-12">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-semibold text-text uppercase tracking-wider">Subtotal</span>
              <span className="font-serif text-24 font-bold text-brand-crimson dark:text-brand-gold">
                {subtotalFormatted}
              </span>
            </div>
            <p className="text-[10px] text-text-muted text-center">
              Taxes (5% GST) & express insured shipping calculated at checkout.
            </p>
            <Button fullWidth onClick={handleCheckout} className="flex items-center justify-center gap-8">
              Proceed to Checkout <ArrowRight className="w-16 h-16" />
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
};
