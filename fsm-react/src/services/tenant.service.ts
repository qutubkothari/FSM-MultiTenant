import { supabase } from './supabase';
import { Tenant } from '../store/tenantStore';

export interface CreateTenantData {
  name: string;
  slug: string;
  companyName: string;
  contactEmail?: string;
  contactPhone?: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
}

export interface UpdateTenantData {
  name?: string;
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
}

class TenantService {
  /**
   * Get tenant by slug
   */
  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching tenant:', error);
        return null;
      }

      return this.mapTenantData(data);
    } catch (error) {
      console.error('Error in getTenantBySlug:', error);
      return null;
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(id: string): Promise<Tenant | null> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching tenant:', error);
        return null;
      }

      return this.mapTenantData(data);
    } catch (error) {
      console.error('Error in getTenantById:', error);
      return null;
    }
  }

  /**
   * Get all active tenants (for tenant selection page)
   */
  async getAllTenants(): Promise<Tenant[]> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching tenants:', error);
        return [];
      }

      return data.map(this.mapTenantData);
    } catch (error) {
      console.error('Error in getAllTenants:', error);
      return [];
    }
  }

  /**
   * Create a new tenant
   */
  async createTenant(tenantData: CreateTenantData): Promise<Tenant | null> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .insert({
          name: tenantData.name,
          slug: tenantData.slug.toLowerCase().trim(),
          company_name: tenantData.companyName,
          contact_email: tenantData.contactEmail,
          contact_phone: tenantData.contactPhone,
          primary_color: tenantData.primaryColor || '#1976d2',
          secondary_color: tenantData.secondaryColor || '#dc004e',
          logo_url: tenantData.logoUrl,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating tenant:', error);
        throw new Error(error.message);
      }

      return this.mapTenantData(data);
    } catch (error) {
      console.error('Error in createTenant:', error);
      throw error;
    }
  }

  /**
   * Update tenant details
   */
  async updateTenant(tenantId: string, updates: UpdateTenantData): Promise<Tenant | null> {
    try {
      const updateData: any = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.companyName) updateData.company_name = updates.companyName;
      if (updates.contactEmail) updateData.contact_email = updates.contactEmail;
      if (updates.contactPhone) updateData.contact_phone = updates.contactPhone;
      if (updates.address) updateData.address = updates.address;
      if (updates.primaryColor) updateData.primary_color = updates.primaryColor;
      if (updates.secondaryColor) updateData.secondary_color = updates.secondaryColor;
      if (updates.logoUrl !== undefined) updateData.logo_url = updates.logoUrl;

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('tenants')
        .update(updateData)
        .eq('id', tenantId)
        .select()
        .single();

      if (error) {
        console.error('Error updating tenant:', error);
        throw new Error(error.message);
      }

      return this.mapTenantData(data);
    } catch (error) {
      console.error('Error in updateTenant:', error);
      throw error;
    }
  }

  /**
   * Upload tenant logo
   */
  async uploadLogo(tenantId: string, file: File): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${tenantId}/logo-${Date.now()}.${fileExt}`;
      const filePath = `tenant-logos/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Error uploading logo:', uploadError);
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      const logoUrl = urlData.publicUrl;

      // Update tenant with logo URL
      await this.updateTenant(tenantId, { logoUrl });

      return logoUrl;
    } catch (error) {
      console.error('Error in uploadLogo:', error);
      throw error;
    }
  }

  /**
   * Check if tenant slug is available
   */
  async isSlugAvailable(slug: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', slug.toLowerCase().trim())
        .maybeSingle();

      if (error) {
        console.error('Error checking slug availability:', error);
        return false;
      }

      return !data;
    } catch (error) {
      console.error('Error in isSlugAvailable:', error);
      return false;
    }
  }

  /**
   * Resolve tenant from URL
   */
  async resolveTenantFromUrl(): Promise<Tenant | null> {
    try {
      const hostname = window.location.hostname;
      const pathname = window.location.pathname;

      let tenantSlug: string | null = null;

      // Strategy 1: Subdomain-based (e.g., acme.fsm.com)
      const parts = hostname.split('.');
      if (parts.length > 2 && parts[0] !== 'www') {
        tenantSlug = parts[0];
      }
      // Strategy 2: Path-based (e.g., fsm.com/acme)
      else if (pathname.startsWith('/') && pathname.length > 1) {
        const pathParts = pathname.split('/').filter(p => p);
        if (pathParts.length > 0) {
          // Check if first path segment is a valid tenant slug
          const possibleSlug = pathParts[0];
          if (possibleSlug && possibleSlug.length > 0) {
            tenantSlug = possibleSlug;
          }
        }
      }

      if (!tenantSlug) {
        return null;
      }

      return await this.getTenantBySlug(tenantSlug);
    } catch (error) {
      console.error('Error resolving tenant from URL:', error);
      return null;
    }
  }

  /**
   * Map database tenant to Tenant interface
   */
  private mapTenantData(data: any): Tenant {
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      companyName: data.company_name,
      logoUrl: data.logo_url,
      primaryColor: data.primary_color,
      secondaryColor: data.secondary_color,
      contactEmail: data.contact_email,
      contactPhone: data.contact_phone,
      address: data.address,
      isActive: data.is_active,
    };
  }
}

export const tenantService = new TenantService();
