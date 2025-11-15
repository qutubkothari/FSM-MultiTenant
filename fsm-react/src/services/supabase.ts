import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ktvrffbccgxtaststlhw.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
  async loginWithPhone(phone: string, name: string) {
    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('salesmen')
      .select('*')
      .eq('phone', phone)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    // If user exists, return it
    if (existingUser) {
      return {
        id: existingUser.id,
        phone: existingUser.phone,
        name: existingUser.name,
        role: existingUser.is_admin ? 'admin' : 'salesman',
        email: existingUser.email,
        created_at: existingUser.created_at,
        is_active: existingUser.is_active,
      };
    }

    // Create new user
    const { data: newUser, error: createError } = await supabase
      .from('salesmen')
      .insert([{ phone, name, is_admin: false, is_active: true }])
      .select()
      .single();

    if (createError) throw createError;

    return {
      id: newUser.id,
      phone: newUser.phone,
      name: newUser.name,
      role: 'salesman' as const,
      email: newUser.email,
      created_at: newUser.created_at,
      is_active: newUser.is_active,
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
    const { data, error } = await supabase
      .from('visits')
      .insert([visitData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getVisits(salesmanId?: string) {
    let query = supabase
      .from('visits')
      .select('*')
      .order('created_at', { ascending: false });

    if (salesmanId) {
      query = query.eq('salesman_id', salesmanId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async updateVisit(id: string, updates: any) {
    const { data, error } = await supabase
      .from('visits')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteVisit(id: string) {
    const { error } = await supabase.from('visits').delete().eq('id', id);
    if (error) throw error;
  },
};

// Product service
export const productService = {
  async getProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
  },

  async createProduct(productData: any) {
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateProduct(id: string, updates: any) {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteProduct(id: string) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  },
};

// Salesman service
export const salesmanService = {
  async getSalesmen() {
    const { data, error } = await supabase
      .from('salesmen')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
  },

  async createSalesman(salesmanData: any) {
    const { data, error } = await supabase
      .from('salesmen')
      .insert([salesmanData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateSalesman(id: string, updates: any) {
    const { data, error } = await supabase
      .from('salesmen')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteSalesman(id: string) {
    const { error } = await supabase.from('salesmen').delete().eq('id', id);
    if (error) throw error;
  },
};

// Customer service
export const customerService = {
  async getCustomers() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
  },

  async createCustomer(customerData: any) {
    const { data, error } = await supabase
      .from('customers')
      .insert([customerData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCustomer(id: string, updates: any) {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCustomer(id: string) {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
  },
};

// Targets service
export const targetsService = {
  async getTargets(salesmanId?: string, month?: number, year?: number) {
    let query = supabase
      .from('salesman_targets')
      .select('*, salesmen(name)')
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
    
    // Map salesman name
    return data.map((target: any) => ({
      ...target,
      salesman_name: target.salesmen?.name || 'Unknown',
    }));
  },

  async getTarget(salesmanId: string, month: number, year: number) {
    const { data, error } = await supabase
      .from('salesman_targets')
      .select('*, salesmen(name)')
      .eq('salesman_id', salesmanId)
      .eq('month', month)
      .eq('year', year)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignore not found
    
    if (data) {
      return {
        ...data,
        salesman_name: data.salesmen?.name || 'Unknown',
      };
    }
    return null;
  },

  async createTarget(targetData: any) {
    const { data, error } = await supabase
      .from('salesman_targets')
      .insert([targetData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTarget(id: string, updates: any) {
    const { data, error } = await supabase
      .from('salesman_targets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
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
    const { error } = await supabase.from('salesman_targets').delete().eq('id', id);
    if (error) throw error;
  },
};

