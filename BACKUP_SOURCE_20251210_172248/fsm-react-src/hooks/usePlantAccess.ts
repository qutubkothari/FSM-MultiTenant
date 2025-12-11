/**
 * Plant Access Control Hook
 * 
 * Provides utilities to filter data based on admin's assigned plants.
 * - Super admins (empty assigned_plants array) see all data
 * - Regular admins only see data from their assigned plants
 */

import { useAuthStore } from '../store/authStore';

export function usePlantAccess() {
  const { user } = useAuthStore();

  /**
   * Check if user has access to all plants (super admin)
   */
  const hasAccessToAllPlants = (): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    // Empty array or null means access to all plants
    const hasFullAccess = !user.assigned_plants || user.assigned_plants.length === 0;
    
    console.log('🔐 hasAccessToAllPlants check:', {
      user: user.name,
      role: user.role,
      assigned_plants: user.assigned_plants,
      hasFullAccess
    });
    
    return hasFullAccess;
  };

  /**
   * Get list of plant IDs the user has access to
   */
  const getAccessiblePlantIds = (): string[] | null => {
    if (!user) return null;
    const result = hasAccessToAllPlants() ? null : (user.assigned_plants || []);
    
    console.log('🔐 getAccessiblePlantIds result:', result);
    
    return result;
  };

  /**
   * Check if user has access to a specific plant
   */
  const hasAccessToPlant = (plantId: string): boolean => {
    if (!user) return false;
    if (hasAccessToAllPlants()) return true;
    return user.assigned_plants?.includes(plantId) || false;
  };

  /**
   * Filter array of items by plant field
   * @param items Array of objects with plant field (string or array)
   * @param plantField Name of the plant field in the objects
   */
  const filterByPlantAccess = <T extends Record<string, any>>(
    items: T[],
    plantField: string = 'plant'
  ): T[] => {
    if (hasAccessToAllPlants()) {
      console.log('🔐 Admin has access to ALL plants');
      return items;
    }
    
    const accessiblePlants = getAccessiblePlantIds();
    if (!accessiblePlants || accessiblePlants.length === 0) {
      console.log('🔐 No accessible plants defined, returning all items');
      return items;
    }

    console.log('🔐 Filtering by accessible plants:', accessiblePlants);

    const filtered = items.filter((item, index) => {
      const plantValue = item[plantField];
      
      if (index === 0) {
        console.log('🔐 Sample item plant value:', {
          plantValue,
          isArray: Array.isArray(plantValue),
          type: typeof plantValue
        });
      }
      
      if (!plantValue) return false;

      // Handle array of plant IDs
      if (Array.isArray(plantValue)) {
        const hasMatch = plantValue.some(p => accessiblePlants.includes(p));
        if (index === 0) {
          console.log('🔐 Array comparison:', {
            itemPlants: plantValue,
            accessiblePlants,
            hasMatch
          });
        }
        return hasMatch;
      }

      // Handle single plant ID
      return accessiblePlants.includes(plantValue);
    });

    console.log('🔐 Filtered:', filtered.length, 'out of', items.length, 'items');
    return filtered;
  };

  /**
   * Build Supabase query filter for plant access
   * Returns filter to add to .in('plant', [...]) or null for no filter
   */
  const getPlantFilter = (): string[] | null => {
    if (hasAccessToAllPlants()) return null;
    return getAccessiblePlantIds();
  };

  return {
    hasAccessToAllPlants,
    getAccessiblePlantIds,
    hasAccessToPlant,
    filterByPlantAccess,
    getPlantFilter,
  };
}
