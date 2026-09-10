import { create } from 'zustand';
import axios from 'axios';

interface OrderState {
  orders: any[];
  loading: boolean;
  error: string | null;
  fetchMyOrders: () => Promise<void>;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  loading: false,
  error: null,

  fetchMyOrders: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get('/api/orders/myorders');
      set({ orders: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  }
}));
