import { create } from 'zustand';
import OfflineSyncService from '@/services/offline-sync.service';

interface SyncState {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  syncError: string | null;
  
  syncNow: () => Promise<void>;
  updatePendingCount: () => Promise<void>;
  updateLastSyncTime: () => Promise<void>;
  startAutoSync: () => void;
  stopAutoSync: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false,
  pendingCount: 0,
  lastSyncTime: null,
  syncError: null,

  syncNow: async () => {
    set({ isSyncing: true, syncError: null });
    
    try {
      const result = await OfflineSyncService.syncPendingVisits();
      
      if (result.failed > 0) {
        set({ 
          syncError: `${result.failed} visits failed to sync`,
          isSyncing: false
        });
      } else {
        set({ isSyncing: false });
      }
      
      // Update pending count and last sync time
      const pendingCount = await OfflineSyncService.getPendingCount();
      const lastSyncTime = await OfflineSyncService.getLastSyncTime();
      
      set({ pendingCount, lastSyncTime });
    } catch (error) {
      set({ 
        syncError: 'Sync failed. Please try again.',
        isSyncing: false 
      });
      console.error('Sync error:', error);
    }
  },

  updatePendingCount: async () => {
    const pendingCount = await OfflineSyncService.getPendingCount();
    set({ pendingCount });
  },

  updateLastSyncTime: async () => {
    const lastSyncTime = await OfflineSyncService.getLastSyncTime();
    set({ lastSyncTime });
  },

  startAutoSync: () => {
    OfflineSyncService.startAutoSync();
  },

  stopAutoSync: () => {
    OfflineSyncService.stopAutoSync();
  },
}));
