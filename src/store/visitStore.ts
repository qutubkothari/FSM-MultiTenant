import { create } from 'zustand';
import SupabaseService from '@/services/supabase.service';
import LocationService from '@/services/location.service';
import OfflineSyncService from '@/services/offline-sync.service';
import { Visit, VisitFormData } from '@/types/database.types';
import { useAuthStore } from './authStore';
import { useSyncStore } from './syncStore';

interface VisitState {
  visits: Visit[];
  currentVisit: Partial<Visit> | null;
  isCreatingVisit: boolean;
  isLoadingVisits: boolean;
  error: string | null;
  visitStartTime: string | null;
  
  startVisit: () => void;
  endVisit: () => void;
  createVisit: (formData: VisitFormData, customerId?: string) => Promise<boolean>;
  fetchVisits: () => Promise<void>;
  clearError: () => void;
}

export const useVisitStore = create<VisitState>((set, get) => ({
  visits: [],
  currentVisit: null,
  isCreatingVisit: false,
  isLoadingVisits: false,
  error: null,
  visitStartTime: null,

  startVisit: () => {
    const startTime = new Date().toISOString();
    set({ 
      visitStartTime: startTime,
      currentVisit: {
        time_in: startTime
      }
    });
  },

  endVisit: () => {
    const endTime = new Date().toISOString();
    set(state => ({
      currentVisit: state.currentVisit ? {
        ...state.currentVisit,
        time_out: endTime
      } : null
    }));
  },

  createVisit: async (formData: VisitFormData, customerId?: string) => {
    set({ isCreatingVisit: true, error: null });
    
    try {
      const salesman = useAuthStore.getState().salesman;
      if (!salesman) {
        throw new Error('Not authenticated');
      }

      // Get GPS location
      const location = await LocationService.getCurrentLocationWithRetry();
      if (!location) {
        throw new Error('Unable to get GPS location');
      }

      const { visitStartTime, currentVisit } = get();
      
      // Prepare visit data
      const visitData: Omit<Visit, 'id' | 'created_at' | 'updated_at' | 'synced'> = {
        salesman_id: salesman.id,
        customer_id: customerId || '',
        customer_name: formData.customer_name,
        contact_person: formData.contact_person,
        meeting_type: formData.meeting_type,
        products_discussed: formData.products_discussed,
        next_action: formData.next_action,
        next_action_date: formData.next_action_date?.toISOString(),
        potential: formData.potential,
        competitor_name: formData.competitor_name,
        can_be_switched: formData.can_be_switched,
        remarks: formData.remarks,
        gps_latitude: location.latitude,
        gps_longitude: location.longitude,
        time_in: visitStartTime || currentVisit?.time_in || new Date().toISOString(),
        time_out: currentVisit?.time_out,
      };

      // Try to create visit online, fallback to offline queue
      try {
        const visit = await SupabaseService.createVisit({ ...visitData, synced: true });
        set(state => ({
          visits: [visit, ...state.visits],
          isCreatingVisit: false,
          currentVisit: null,
          visitStartTime: null
        }));
        return true;
      } catch (onlineError) {
        console.log('Saving offline:', onlineError);
        // Save to offline queue
        await OfflineSyncService.addToQueue(visitData);
        await useSyncStore.getState().updatePendingCount();
        set({ 
          isCreatingVisit: false,
          currentVisit: null,
          visitStartTime: null
        });
        return true;
      }
      
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create visit',
        isCreatingVisit: false 
      });
      console.error('Create visit error:', error);
      return false;
    }
  },

  fetchVisits: async () => {
    set({ isLoadingVisits: true, error: null });
    
    try {
      const salesman = useAuthStore.getState().salesman;
      if (!salesman) {
        throw new Error('Not authenticated');
      }

      const visits = await SupabaseService.getVisits(salesman.id);
      set({ 
        visits,
        isLoadingVisits: false 
      });
    } catch (error) {
      set({ 
        error: 'Failed to fetch visits',
        isLoadingVisits: false 
      });
      console.error('Fetch visits error:', error);
    }
  },

  clearError: () => set({ error: null }),
}));
