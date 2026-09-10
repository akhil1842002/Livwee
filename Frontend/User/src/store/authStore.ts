import { create } from 'zustand';
import axios from 'axios';

// Configure Axios Defaults
axios.defaults.baseURL = 'http://localhost:5000';
axios.defaults.withCredentials = true; // Essential for sending/receiving HTTP-only cookies

interface User {
  _id: string;
  email: string;
  type: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: any) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => void;
  forgotPassword: (email: string) => Promise<{success: boolean, message: string}>;
  resetPassword: (token: string, password: string) => Promise<{success: boolean, message: string}>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const user = response.data;
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, loading: false });
      return true;
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Login failed', loading: false });
      return false;
    }
  },

  register: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post('/api/auth/register', data);
      const user = response.data;
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, loading: false });
      return true;
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Registration failed', loading: false });
      return false;
    }
  },

  logout: async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      localStorage.removeItem('user');
      set({ user: null });
    }
  },

  checkAuth: () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      set({ user: JSON.parse(userStr) });
    }
  },

  forgotPassword: async (email) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post('/api/auth/forgot-password', { email });
      set({ loading: false });
      return { success: true, message: response.data.message };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send reset link';
      set({ error: message, loading: false });
      return { success: false, message };
    }
  },

  resetPassword: async (token, password) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.put(`/api/auth/reset-password/${token}`, { password });
      set({ loading: false });
      return { success: true, message: response.data.message };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to reset password';
      set({ error: message, loading: false });
      return { success: false, message };
    }
  }
}));
