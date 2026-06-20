import { create } from 'zustand';
import api from '@/services/api';

interface CartState {
  cart: any;
  loading: boolean;
  fetchCart: () => Promise<void>;
  addToCart: (variantId: string, quantity: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  loading: false,

  fetchCart: async () => {
    try {
      set({ loading: true });
      const { data } = await api.get('/cart');
      set({ cart: data, loading: false });
    } catch (error) {
      set({ cart: null, loading: false });
    }
  },

  addToCart: async (variantId, quantity) => {
    try {
      await api.post('/cart/items', { productVariantId: variantId, quantity });
      await get().fetchCart();
    } catch (error: any) {
      throw error;
    }
  },

  updateQuantity: async (itemId, quantity) => {
    if (quantity < 1) {
      await get().removeItem(itemId);
      return;
    }
    try {
      await api.patch(`/cart/items/${itemId}`, { quantity });
      await get().fetchCart();
    } catch (error: any) {
      throw error;
    }
  },

  removeItem: async (itemId) => {
    try {
      await api.delete(`/cart/items/${itemId}`);
      await get().fetchCart();
    } catch (error: any) {
      throw error;
    }
  }
}));
