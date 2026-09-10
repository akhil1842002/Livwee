import { create } from 'zustand';
import axios from 'axios';

interface Product {
  _id: string;
  name: string;
  sku: string;
  description: string;
  price: number;
  discount_price?: number;
  category: { _id: string, name: string };
  image_url: string;
  stock_status: string;
}

interface ProductState {
  products: Product[];
  productDetails: Product | null;
  loading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  fetchProductDetails: (id: string) => Promise<void>;
}

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  productDetails: null,
  loading: false,
  error: null,

  fetchProducts: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get('/api/products');
      set({ products: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchProductDetails: async (id) => {
    set({ loading: true, error: null, productDetails: null });
    try {
      const response = await axios.get(`/api/products/${id}`);
      set({ productDetails: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  }
}));
