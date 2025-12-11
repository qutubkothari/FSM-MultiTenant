import { createClient } from '@supabase/supabase-js';
import { useTenantStore } from '../store/tenantStore';

// Original SAK-FSM Supabase Configuration
// Force new bundle hash to clear browser cache - Debug currency loading v3 with fire emojis
export const CACHE_VERSION = 'v1.0.20251209-debug3-fire'; 
const supabaseUrl = 'https://ktvrffbccgxtaststlhw.supabase.co';
const supabaseKey = 'sb_publishable_sNhpQ5W6i_KuIPcT6bjjnw_BcJwPljV';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },
});

// Auth service
export const authService = {
  async loginWithPhone(phone: string, password: string) {
    // Check if user exists in users table with password
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .eq('password', password)
      .eq('is_active', true)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new Error('Invalid phone number or password');
      }
      throw fetchError;
    }

    if (!user) {
      throw new Error('Invalid phone number or password');
    }

    // Get assigned_plants from user record (already in users table)
    let assigned_plants: string[] = user.assigned_plants || [];
    
    console.log('🔐 Login success - Plant access:', {
      name: user.name,
      role: user.role,
      assigned_plants: assigned_plants,
      hasFullAccess: assigned_plants.length === 0
    });

    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      name_ar: user.name_ar,
      role: user.role as 'admin' | 'salesman' | 'super_admin',
      created_at: user.created_at,
      is_active: user.is_active,
      tenant_id: user.tenant_id,
      preferred_language: user.preferred_language,
      assigned_plants: assigned_plants,
    };
  },

  async logout() {
    // Clear local storage
    localStorage.removeItem('fsm_user');
  },
};

// Visit service
export const visitService = {
  async createVisit(visitData: any) {
    const tenantId = useTenantStore.getState().tenant?.id;
    if (!tenantId) throw new Error('No tenant selected');
    
    const { data, error } = await supabase
      .from('visits')
      .insert([{ ...visitData, tenant_id: tenantId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getVisits(salesmanId?: string, userPhone?: string, limit?: number, page?: number) {
    const tenantId = useTenantStore.getState().tenant?.id;
    if (!tenantId) throw new Error('No tenant selected');
    
    let query = supabase
      .from('visits')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // If userPhone is provided, look up the salesman_id from phone
    if (userPhone && !salesmanId) {
      const { data: salesman } = await supabase
        .from('salesmen')
        .select('id')
        .eq('phone', userPhone)
        .is('deleted_at', null)
        .maybeSingle();
      
      if (salesman) {
        salesmanId = salesman.id;
      }
    }

    if (salesmanId) {
      query = query.eq('salesman_id', salesmanId);
    }

    // Handle pagination or limit
    if (page !== undefined && limit) {
      const from = page * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    } else if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async updateVisit(id: string, updates: any) {
    const tenantId = useTenantStore.getState().tenant?.id;
    if (!tenantId) throw new Error('No tenant selected');
    
    const { data, error } = await supabase
      .from('visits')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteVisit(id: string) {
    const tenantId = useTenantStore.getState().tenant?.id;
    if (!tenantId) throw new Error('No tenant selected');
    
    const { error } = await supabase
      .from('visits')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId);
    if (error) throw error;
  },
};

// Product service
export const productService = {
  async getProducts(tenantId?: string) {
    let query = supabase
      .from('products')
      .select('*')
      .is('deleted_at', null);
    
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
    
    const { data, error } = await query.order('name');

    if (error) throw error;
    return data;
  },

  async createProduct(productData: any) {
    const tenantId = useTenantStore.getState().tenant?.id;
    if (!tenantId) throw new Error('No tenant selected');
    
    const { data, error } = await supabase
      .from('products')
      .insert([{ ...productData, tenant_id: tenantId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateProduct(id: string, updates: any) {
    const tenantId = useTenantStore.getState().tenant?.id;
    if (!tenantId) throw new Error('No tenant selected');
    
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteProduct(id: string) {
    const tenantId = useTenantStore.getState().tenant?.id;
    if (!tenantId) throw new Error('No tenant selected');
    
    const { error } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId);
    if (error) throw error;
  },
};

// Salesman service
export const salesmanService = {
  async getSalesmen() {
    const tenantId = useTenantStore.getState().tenant?.id;
    if (!tenantId) throw new Error('No tenant selected');
    
    const { data, error } = await supabase
      .from('salesmen')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name');

    if (error) throw error;
    return data;
  },

  async createSalesman(salesmanData: any) {
    const tenantId = useTenantStore.getState().tenant?.id;
    if (!tenantId) throw new Error('No tenant selected');
    
    const { data, error } = await supabase
      .from('salesmen')
      .insert([{ ...salesmanData, tenant_id: tenantId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateSalesman(id: string, updates: any) {
    const tenantId = useTenantStore.getState().tenant?.id;
    if (!tenantId) throw new Error('No tenant selected');
    
    const { data, error } = await supabase
      .from('salesmen')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteSalesman(id: string) {
    const tenantId = useTenantStore.getState().tenant?.id;
    if (!tenantId) throw new Error('No tenant selected');
    
    const { error } = await supabase
      .from('salesmen')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId);
    if (error) throw error;
  },
};

// Customer service
export const customerService = {
  async getCustomers() {
    const tenantId = useTenantStore.getState().tenant?.id;
    if (!tenantId) throw new Error('No tenant selected');
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name');

    if (error) throw error;
    return data;
  },

  async createCustomer(customerData: any) {
    const tenantId = useTenantStore.getState().tenant?.id;
    if (!tenantId) throw new Error('No tenant selected');
    
    const { data, error } = await supabase
      .from('customers')
      .insert([{ ...customerData, tenant_id: tenantId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCustomer(id: string, updates: any) {
    const tenantId = useTenantStore.getState().tenant?.id;
    if (!tenantId) throw new Error('No tenant selected');
    
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCustomer(id: string) {
    const tenantId = useTenantStore.getState().tenant?.id;
    if (!tenantId) throw new Error('No tenant selected');
    
    const { error } = await supabase
      .from('customers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId);
    if (error) throw error;
  },
};

// Targets service
export const targetsService = {
  async getTargets(salesmanId?: string, month?: number, year?: number) {
    const tenantId = useTenantStore.getState().tenant?.id;
    if (!tenantId) throw new Error('No tenant selected');
    
    let query = supabase
      .from('salesman_targets')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (salesmanId) {
      query = query.eq('salesman_id', salesmanId);
    }
    if (month !== undefined) {
      query = query.eq('month', month);
    }
    if (year !== undefined) {
      query = query.eq('year', year);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    // Fetch salesman names separately to avoid relationship ambiguity
    const salesmenIds = [...new Set(data.map((t: any) => t.salesman_id))];
    const { data: salesmenData } = await supabase
      .from('salesmen')
      .select('id, name')
      .is('deleted_at', null)
      .in('id', salesmenIds);
    
    const salesmenMap = new Map(salesmenData?.map((s: any) => [s.id, s.name]));
    
    return data.map((target: any) => ({
      ...target,
      salesman_name: salesmenMap.get(target.salesman_id) || 'Unknown',
    }));
  },

  async getTarget(salesmanId: string, month: number, year: number) {
    const { data, error } = await supabase
      .from('salesman_targets')
      .select('*')
      .is('deleted_at', null)
      .eq('salesman_id', salesmanId)
      .eq('month', month)
      .eq('year', year)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignore not found
    
    if (data) {
      // Fetch salesman name separately
      const { data: salesmanData } = await supabase
        .from('salesmen')
        .select('name')
        .is('deleted_at', null)
        .eq('id', salesmanId)
        .single();
      
      return {
        ...data,
        salesman_name: salesmanData?.name || 'Unknown',
      };
    }
    return null;
  },

  async createTarget(targetData: any) {
    const tenantId = useTenantStore.getState().tenant?.id;
    if (!tenantId) throw new Error('No tenant selected');
    
    const { data, error } = await supabase
      .from('salesman_targets')
      .insert([{ ...targetData, tenant_id: tenantId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTarget(id: string, updates: any) {
    const tenantId = useTenantStore.getState().tenant?.id;
    if (!tenantId) throw new Error('No tenant selected');
    
    const { data, error } = await supabase
      .from('salesman_targets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async upsertTarget(targetData: any) {
    const { data, error } = await supabase
      .from('salesman_targets')
      .upsert([targetData], {
        onConflict: 'salesman_id,month,year',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTarget(id: string) {
    const tenantId = useTenantStore.getState().tenant?.id;
    if (!tenantId) throw new Error('No tenant selected');
    
    const { error } = await supabase
      .from('salesman_targets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId);
    if (error) throw error;
  },
};

