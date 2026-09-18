import { create } from 'zustand';
import { useAuthStore } from './useAuthStore.ts';
import { useToastStore } from './useToastStore.ts';

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId: string;
  quantity: number;
  title: string;
  pricePaise: number;
  discountPricePaise?: number;
  slug: string;
  size: string;
  color: string;
  stockQuantity: number;
  imageUrl?: string;
}

interface CartState {
  items: CartItem[];
  isDrawerOpen: boolean;
  isBouncing: boolean;
  isLoading: boolean;
  setDrawerOpen: (open: boolean) => void;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, variantId: string, quantity?: number, itemDetails?: Partial<CartItem>) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => void;
  totalPaise: () => number;
  totalCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isDrawerOpen: false,
  isBouncing: false,
  isLoading: false,

  setDrawerOpen: (open) => set({ isDrawerOpen: open }),

  fetchCart: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    set({ isLoading: true });
    try {
      const res = await fetch('/api/cart', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        set({ items: data.items || [] });
      }
    } catch (err) {
      console.error('Failed to fetch cart:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (productId, variantId, quantity = 1, itemDetails) => {
    const token = useAuthStore.getState().token;
    const addToast = useToastStore.getState().addToast;

    // Trigger bounce animation (300ms)
    set({ isBouncing: true });
    setTimeout(() => set({ isBouncing: false }), 300);

    if (token) {
      try {
        const res = await fetch('/api/cart/items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ productId, variantId, quantity }),
        });

        if (res.ok) {
          await get().fetchCart();
          addToast('success', 'Added to your luxury shopping bag');
        } else {
          const errData = await res.json();
          addToast('error', errData.error || 'Could not add item');
        }
      } catch {
        addToast('error', 'Failed to update bag');
      }
    } else {
      // Local state guest fallback
      const existing = get().items.find((i) => i.variantId === variantId);
      if (existing) {
        set({
          items: get().items.map((i) =>
            i.variantId === variantId ? { ...i, quantity: i.quantity + quantity } : i
          ),
        });
      } else if (itemDetails) {
        set({
          items: [
            ...get().items,
            {
              id: Math.random().toString(36).substring(2),
              cartId: 'guest-cart',
              productId,
              variantId,
              quantity,
              title: itemDetails.title || 'Product',
              pricePaise: itemDetails.pricePaise || 0,
              discountPricePaise: itemDetails.discountPricePaise,
              slug: itemDetails.slug || '',
              size: itemDetails.size || 'M',
              color: itemDetails.color || 'Default',
              stockQuantity: itemDetails.stockQuantity || 10,
              imageUrl: itemDetails.imageUrl,
            },
          ],
        });
      }
      addToast('success', 'Added to your luxury shopping bag');
    }
  },

  updateQuantity: async (itemId, quantity) => {
    const token = useAuthStore.getState().token;
    if (token) {
      try {
        const res = await fetch(`/api/cart/items/${itemId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ quantity }),
        });
        if (res.ok) {
          await get().fetchCart();
        }
      } catch (err) {
        console.error('Failed to update quantity:', err);
      }
    } else {
      if (quantity <= 0) {
        set({ items: get().items.filter((i) => i.id !== itemId) });
      } else {
        set({
          items: get().items.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
        });
      }
    }
  },

  removeItem: async (itemId) => {
    const token = useAuthStore.getState().token;
    if (token) {
      try {
        const res = await fetch(`/api/cart/items/${itemId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          await get().fetchCart();
        }
      } catch (err) {
        console.error('Failed to remove item:', err);
      }
    } else {
      set({ items: get().items.filter((i) => i.id !== itemId) });
    }
  },

  clearCart: () => set({ items: [] }),

  totalPaise: () => {
    return get().items.reduce((sum, item) => {
      const price = item.discountPricePaise || item.pricePaise;
      return sum + price * item.quantity;
    }, 0);
  },

  totalCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));
