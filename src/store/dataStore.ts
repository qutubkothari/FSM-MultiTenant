import { create } from 'zustand';
import SupabaseService from '@/services/supabase.service';
import StorageService from '@/services/storage.service';
import { Product, Customer } from '@/types/database.types';

interface DataState {
  products: Product[];
  customers: Customer[];
  isLoadingProducts: boolean;
  isLoadingCustomers: boolean;
  
  fetchProducts: () => Promise<void>;
  fetchCustomers: (searchTerm?: string) => Promise<void>;
  getOrCreateCustomer: (name: string, contactPerson?: string) => Promise<Customer | null>;
}

export const useDataStore = create<DataState>((set) => ({
  products: [],
  customers: [],
  isLoadingProducts: false,
  isLoadingCustomers: false,

  fetchProducts: async () => {
    set({ isLoadingProducts: true });
    
    try {
      // Try to fetch from server
      const products = await SupabaseService.getProducts();
      
      if (products.length > 0) {
        await StorageService.cacheProducts(products);
        set({ products, isLoadingProducts: false });
      } else {
        // Fallback to cache
        const cached = await StorageService.getCachedProducts();
        set({ 
          products: cached || [], 
          isLoadingProducts: false 
        });
      }
    } catch (error) {
      // Fallback to cache on error
      const cached = await StorageService.getCachedProducts();
      set({ 
        products: cached || [], 
        isLoadingProducts: false 
      });
      console.error('Fetch products error:', error);
    }
  },

  fetchCustomers: async (searchTerm?: string) => {
    set({ isLoadingCustomers: true });
    
    try {
      const customers = await SupabaseService.getCustomers(searchTerm);
      
      if (customers.length > 0) {
        await StorageService.cacheCustomers(customers);
        set({ customers, isLoadingCustomers: false });
      } else {
        // Fallback to cache
        const cached = await StorageService.getCachedCustomers();
        set({ 
          customers: cached || [], 
          isLoadingCustomers: false 
        });
      }
    } catch (error) {
      // Fallback to cache on error
      const cached = await StorageService.getCachedCustomers();
      set({ 
        customers: cached || [], 
        isLoadingCustomers: false 
      });
      console.error('Fetch customers error:', error);
    }
  },

  getOrCreateCustomer: async (name: string, contactPerson?: string) => {
    try {
      return await SupabaseService.getOrCreateCustomer(name, contactPerson);
    } catch (error) {
      console.error('Get or create customer error:', error);
      return null;
    }
  },
}));
