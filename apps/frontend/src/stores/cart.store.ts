import { create } from 'zustand';
import { api, type CartBreakdown } from '@/lib/api';

interface CartState {
  isOpen: boolean;
  loading: boolean;
  pulseBadge: boolean;
  breakdown: CartBreakdown | null;
  totalItems: number;
  announcement: string | null;

  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  triggerPulse: () => void;
  setAnnouncement: (msg: string | null) => void;

  fetchCart: () => Promise<void>;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<{ success: boolean; error?: string }>;
  removeCoupon: () => Promise<void>;
}

const countItems = (breakdown: CartBreakdown | null) =>
  breakdown?.items.reduce((acc, item) => acc + item.quantity, 0) ?? 0;

export const useCartStore = create<CartState>((set, get) => ({
  isOpen: false,
  loading: false,
  pulseBadge: false,
  breakdown: null,
  totalItems: 0,
  announcement: null,

  openDrawer: () => set({ isOpen: true }),
  closeDrawer: () => set({ isOpen: false }),
  toggleDrawer: () => set((state) => ({ isOpen: !state.isOpen })),
  setAnnouncement: (msg: string | null) => set({ announcement: msg }),

  triggerPulse: () => {
    set({ pulseBadge: true });
    setTimeout(() => set({ pulseBadge: false }), 800);
  },

  fetchCart: async () => {
    try {
      set({ loading: true });
      const res = await api.getCart();
      set({ breakdown: res.breakdown, totalItems: countItems(res.breakdown) });
    } catch (err) {
      console.error('Failed to fetch cart:', err);
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (variantId: string, quantity: number = 1) => {
    try {
      get().triggerPulse();
      const res = await api.addToCart(variantId, quantity);
      const total = countItems(res.breakdown);
      const addedItem = res.breakdown.items.find((it) => it.variant_id === variantId);
      const name = addedItem?.product_name || 'Item';
      set({
        breakdown: res.breakdown,
        totalItems: total,
        isOpen: true,
        announcement: `Added ${name} to shopping bag. Bag now contains ${total} items.`,
      });
    } catch (err) {
      console.error('Failed to add item to cart:', err);
      // Re-fetch authoritative cart on error
      await get().fetchCart();
      throw err;
    }
  },

  updateQuantity: async (itemId: string, quantity: number) => {
    const previousBreakdown = get().breakdown;

    // Optimistic UI update
    if (previousBreakdown) {
      const updatedItems = previousBreakdown.items
        .map((it) => (it.variant_id === itemId ? { ...it, quantity } : it))
        .filter((it) => it.quantity > 0);

      const total = updatedItems.reduce((sum, it) => sum + it.quantity, 0);
      set({
        breakdown: {
          ...previousBreakdown,
          items: updatedItems,
        },
        totalItems: total,
        announcement: `Updated item quantity to ${quantity}. Bag now contains ${total} items.`,
      });
    }

    try {
      const res = await api.updateCartItem(itemId, quantity);
      set({ breakdown: res.breakdown, totalItems: countItems(res.breakdown) });
    } catch (err) {
      console.error('Failed to update cart quantity:', err);
      // Rollback on server rejection
      if (previousBreakdown) {
        set({ breakdown: previousBreakdown, totalItems: countItems(previousBreakdown) });
      }
    }
  },

  removeItem: async (itemId: string) => {
    const previousBreakdown = get().breakdown;
    const itemToRemove = previousBreakdown?.items.find((it) => it.variant_id === itemId);
    const itemName = itemToRemove?.product_name || 'Item';

    // Optimistic removal
    if (previousBreakdown) {
      const updatedItems = previousBreakdown.items.filter((it) => it.variant_id !== itemId);
      const total = updatedItems.reduce((sum, it) => sum + it.quantity, 0);
      set({
        breakdown: {
          ...previousBreakdown,
          items: updatedItems,
        },
        totalItems: total,
        announcement: `Removed ${itemName} from shopping bag. Bag now contains ${total} items.`,
      });
    }

    try {
      const res = await api.removeCartItem(itemId);
      set({ breakdown: res.breakdown, totalItems: countItems(res.breakdown) });
    } catch (err) {
      console.error('Failed to remove cart item:', err);
      if (previousBreakdown) {
        set({ breakdown: previousBreakdown, totalItems: countItems(previousBreakdown) });
      }
    }
  },

  applyCoupon: async (code: string) => {
    try {
      const res = await api.applyCoupon(code);
      set({
        breakdown: res.breakdown,
        totalItems: countItems(res.breakdown),
        announcement: `Applied coupon code ${code.toUpperCase()}.`,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to apply coupon' };
    }
  },

  removeCoupon: async () => {
    try {
      const res = await api.removeCoupon();
      set({
        breakdown: res.breakdown,
        totalItems: countItems(res.breakdown),
        announcement: 'Removed coupon code.',
      });
    } catch (err) {
      console.error('Failed to remove coupon:', err);
    }
  },
}));
