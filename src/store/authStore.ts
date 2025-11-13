import { create } from 'zustand';
import SupabaseService from '@/services/supabase.service';
import StorageService from '@/services/storage.service';
import { Salesman } from '@/types/database.types';

interface AuthState {
  salesman: Salesman | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (phone: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  salesman: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (phone: string, name?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Try to find existing salesman
      let salesman = await SupabaseService.getSalesmanByPhone(phone);
      
      // If not found and name provided, create new salesman
      if (!salesman && name) {
        salesman = await SupabaseService.createSalesman(name, phone);
      }
      
      if (salesman) {
        await StorageService.saveSalesman(salesman);
        set({ 
          salesman, 
          isAuthenticated: true, 
          isLoading: false 
        });
      } else {
        set({ 
          error: 'Unable to login. Please provide your name.',
          isLoading: false 
        });
      }
    } catch (error) {
      set({ 
        error: 'Login failed. Please check your connection.',
        isLoading: false 
      });
      console.error('Login error:', error);
    }
  },

  logout: async () => {
    await StorageService.removeSalesman();
    set({ 
      salesman: null, 
      isAuthenticated: false,
      error: null
    });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    
    try {
      const salesman = await StorageService.getSalesman();
      
      if (salesman) {
        set({ 
          salesman, 
          isAuthenticated: true, 
          isLoading: false 
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false });
      console.error('Check auth error:', error);
    }
  },

  clearError: () => set({ error: null }),
}));
