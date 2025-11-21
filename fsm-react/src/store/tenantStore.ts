import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  companyName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  isActive: boolean;
}

interface TenantStore {
  tenant: Tenant | null;
  isLoading: boolean;
  error: string | null;
  setTenant: (tenant: Tenant | null) => void;
  clearTenant: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTenantStore = create<TenantStore>()(
  persist(
    (set) => ({
      tenant: null,
      isLoading: false,
      error: null,
      setTenant: (tenant) => set({ tenant, error: null }),
      clearTenant: () => set({ tenant: null, error: null }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error, isLoading: false }),
    }),
    {
      name: 'fsm-tenant-storage',
      partialize: (state) => ({ tenant: state.tenant }),
    }
  )
);

// Helper function to get current tenant ID
export const getCurrentTenantId = (): string | null => {
  return useTenantStore.getState().tenant?.id || null;
};

// Helper function to check if user is in a tenant context
export const hasActiveTenant = (): boolean => {
  const tenant = useTenantStore.getState().tenant;
  return !!(tenant?.id && tenant?.isActive);
};
