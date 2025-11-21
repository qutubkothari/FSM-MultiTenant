/**
 * Tenant Context Utilities
 * Add these functions to your existing supabase.ts file
 */

import { useTenantStore, getCurrentTenantId } from '../store/tenantStore';

/**
 * Helper function to add tenant filter to Supabase queries
 * Usage: query = withTenantFilter(query);
 */
export const withTenantFilter = (query: any) => {
  const tenantId = getCurrentTenantId();
  if (tenantId) {
    return query.eq('tenant_id', tenantId);
  }
  console.warn('No tenant context available');
  return query;
};

/**
 * Helper function to add tenant_id to data being inserted
 * Usage: const dataWithTenant = withTenantId(data);
 */
export const withTenantId = <T extends Record<string, any>>(data: T): T & { tenant_id: string } => {
  const tenantId = getCurrentTenantId();
  if (!tenantId) {
    throw new Error('No tenant selected. Please select an organization.');
  }
  return {
    ...data,
    tenant_id: tenantId,
  };
};

/**
 * Validate tenant context before operations
 */
export const validateTenantContext = (): string => {
  const tenantId = getCurrentTenantId();
  if (!tenantId) {
    throw new Error('No tenant context. Please select an organization.');
  }
  return tenantId;
};

// Example usage in your service methods:
// 
// // For SELECT queries:
// export const getVisits = async (salesmanId?: string) => {
//   let query = supabase.from('visits').select('*');
//   query = withTenantFilter(query); // Add this line
//   if (salesmanId) {
//     query = query.eq('salesman_id', salesmanId);
//   }
//   const { data, error } = await query;
//   return { data, error };
// };
//
// // For INSERT operations:
// export const createVisit = async (visitData: any) => {
//   const dataWithTenant = withTenantId(visitData); // Add this line
//   const { data, error } = await supabase
//     .from('visits')
//     .insert(dataWithTenant)
//     .select()
//     .single();
//   return { data, error };
// };
//
// // For UPDATE operations:
// export const updateVisit = async (id: string, updates: any) => {
//   validateTenantContext(); // Validate first
//   const { data, error } = await supabase
//     .from('visits')
//     .update(updates)
//     .eq('id', id)
//     .select()
//     .single();
//   return { data, error };
// };
