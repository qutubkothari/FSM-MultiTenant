import { supabase } from './supabase';

export interface Plant {
  id: string;
  tenant_id: string;
  plant_code: string;
  plant_name: string;
  plant_name_ar?: string | null;
  area: string | null;
  area_ar?: string | null;
  city: string | null;
  city_ar?: string | null;
  created_at: string;
  updated_at: string;
}

export const plantService = {
  async getPlants(tenantId: string): Promise<Plant[]> {
    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('plant_name');

    if (error) throw error;
    return data || [];
  },

  async getPlantById(id: string): Promise<Plant | null> {
    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createPlant(plant: Omit<Plant, 'id' | 'created_at' | 'updated_at'>): Promise<Plant> {
    const { data, error } = await supabase
      .from('plants')
      .insert([plant])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePlant(id: string, updates: Partial<Plant>): Promise<Plant> {
    const { data, error } = await supabase
      .from('plants')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deletePlant(id: string): Promise<void> {
    const { error } = await supabase
      .from('plants')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },
};
