import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { authService, supabase } from '../services/supabase';
import { useTenantStore } from './tenantStore';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      login: async (phone: string, password: string) => {
        set({ isLoading: true, error: null, user: null });
        try {
          // Login without requiring pre-selected tenant
          console.log('🔍 AUTH STORE: Starting login process');
          const userData = await authService.loginWithPhone(phone, password);
          console.log('🔍 AUTH STORE: Got user data, tenant_id:', userData.tenant_id);
          const user: User = {
            ...userData,
            role: userData.role as 'admin' | 'salesman',
          };
          set({ user, isLoading: false, error: null });
          
          // Automatically set tenant if user has tenant_id
          console.log('🔍 AUTH STORE: Checking if should load tenant...');
          if (userData.tenant_id) {
            try {
              const { data: tenantData } = await supabase
                .from('tenants')
                .select('*')
                .eq('id', userData.tenant_id)
                .single();
              
              if (tenantData) {
                // Debug logging for currency
                console.log('🔍 TENANT DEBUG:', {
                  tenantName: tenantData.name,
                  currencyCode: tenantData.currency_code,
                  currencySymbol: tenantData.currency_symbol,
                  rawData: tenantData
                });
                
                useTenantStore.getState().setTenant({
                  id: tenantData.id,
                  name: tenantData.name,
                  slug: tenantData.slug,
                  companyName: tenantData.company_name,
                  logoUrl: tenantData.logo_url,
                  primaryColor: tenantData.primary_color || '#1976d2',
                  secondaryColor: tenantData.secondary_color || '#dc004e',
                  contactEmail: tenantData.contact_email,
                  contactPhone: tenantData.contact_phone,
                  address: tenantData.address,
                  isActive: tenantData.is_active,
                  defaultLanguage: tenantData.default_language,
                  translationEnabled: tenantData.translation_enabled,
                  translation_enabled: tenantData.translation_enabled,
                  currencyCode: tenantData.currency_code || 'USD',
                  currency_code: tenantData.currency_code || 'USD',
                  currencySymbol: tenantData.currency_symbol || '$',
                  currency_symbol: tenantData.currency_symbol || '$',
                });
              }
            } catch (tenantError) {
              console.error('Failed to load tenant:', tenantError);
              // Don't fail login if tenant load fails
            }
          }
        } catch (error: any) {
          const errorMessage = error?.message || 'Login failed';
          set({ error: errorMessage, isLoading: false, user: null });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authService.logout();
          useTenantStore.getState().clearTenant(); // Clear tenant on logout
          set({ user: null, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'fsm_user',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
