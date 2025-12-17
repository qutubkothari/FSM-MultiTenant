import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENV } from '@/config/env';
import type { Salesman, Customer, Product, Visit, Competitor } from '@/types/database.types';

class SupabaseService {
  private static instance: SupabaseService;
  private client: SupabaseClient;

  private constructor() {
    this.client = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY);
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  // Salesman Operations
  async getSalesmanByPhone(phone: string): Promise<Salesman | null> {
    const { data, error } = await this.client
      .from('salesmen')
      .select('*')
      .eq('phone', phone)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching salesman:', error);
      return null;
    }
    return data;
  }

  async createSalesman(name: string, phone: string): Promise<Salesman | null> {
    const { data, error } = await this.client
      .from('salesmen')
      .insert({ name, phone, is_active: true })
      .select()
      .single();

    if (error) {
      console.error('Error creating salesman:', error);
      return null;
    }
    return data;
  }

  // Customer Operations
  async getCustomers(searchTerm?: string): Promise<Customer[]> {
    let query = this.client.from('customers').select('*');

    if (searchTerm) {
      query = query.ilike('name', `%${searchTerm}%`);
    }

    const { data, error } = await query.order('name');

    if (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
    return data || [];
  }

  async createCustomer(customer: Partial<Customer>): Promise<Customer | null> {
    const { data, error } = await this.client
      .from('customers')
      .insert(customer)
      .select()
      .single();

    if (error) {
      console.error('Error creating customer:', error);
      return null;
    }
    return data;
  }

  async getOrCreateCustomer(name: string, contactPerson?: string): Promise<Customer | null> {
    // Try to find existing customer - use limit(1) instead of single() to avoid timeout
    const { data: existing } = await this.client
      .from('customers')
      .select('*')
      .ilike('name', name)
      .limit(1);

    if (existing && existing.length > 0) {
      return existing[0];
    }

    // Create new customer
    return this.createCustomer({ name, contact_person: contactPerson });
  }

  // Product Operations
  async getProducts(): Promise<Product[]> {
    const { data, error } = await this.client
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching products:', error);
      return [];
    }
    return data || [];
  }

  // Visit Operations
  async createVisit(visit: Partial<Visit>): Promise<Visit> {
    // Add 10-second timeout to prevent endless waiting
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout - server not responding')), 10000)
    );

    const insertPromise = this.client
      .from('visits')
      .insert(visit)
      .select()
      .single();

    const { data, error } = await Promise.race([insertPromise, timeoutPromise]);

    if (error) {
      console.error('Error creating visit:', error);
      throw error;
    }
    if (!data) {
      throw new Error('Failed to create visit');
    }
    return data;
  }

  async getVisits(salesmanId: string, limit = 100): Promise<Visit[]> {
    const { data, error } = await this.client
      .from('visits')
      .select('*')
      .eq('salesman_id', salesmanId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching visits:', error);
      return [];
    }
    return data || [];
  }

  async getVisitById(id: string): Promise<Visit | null> {
    const { data, error } = await this.client
      .from('visits')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching visit:', error);
      return null;
    }
    return data;
  }

  async updateVisit(id: string, updates: Partial<Visit>): Promise<Visit | null> {
    const { data, error } = await this.client
      .from('visits')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating visit:', error);
      return null;
    }
    return data;
  }

  // Competitor Operations
  async getCompetitors(): Promise<Competitor[]> {
    const { data, error } = await this.client
      .from('competitors')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching competitors:', error);
      return [];
    }
    return data || [];
  }

  async createCompetitor(name: string): Promise<Competitor | null> {
    const { data, error } = await this.client
      .from('competitors')
      .insert({ name })
      .select()
      .single();

    if (error) {
      console.error('Error creating competitor:', error);
      return null;
    }
    return data;
  }

  // Batch sync for offline data
  async batchCreateVisits(visits: Omit<Visit, 'id' | 'created_at' | 'updated_at'>[]): Promise<Visit[]> {
    const { data, error } = await this.client
      .from('visits')
      .insert(visits)
      .select();

    if (error) {
      console.error('Error batch creating visits:', error);
      return [];
    }
    return data || [];
  }
}

export default SupabaseService.getInstance();
