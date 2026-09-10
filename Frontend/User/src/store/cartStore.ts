import { create } from 'zustand';
import axios from 'axios';

interface CartItem {
  _id: string;
  product_id: any;
  qty: number;
}

interface Cart {
  _id: string;
  items: CartItem[];
}

interface CartState {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  fetchCart: () => Promise<void>;
  addToCart: (product_id: string, qty: number) => Promise<void>;
  updateQty: (product_id: string, qty: number) => Promise<void>;
}

export const useCartStore = create<CartState>((set) => ({
  cart: null,
  loading: false,
  error: null,

  fetchCart: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get('/api/cart');
      set({ cart: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  addToCart: async (product_id, qty) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post('/api/cart/add', { product_id, qty });
      set({ cart: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  updateQty: async (product_id, qty) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.put('/api/cart/update', { product_id, qty });
      set({ cart: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  }
}));
