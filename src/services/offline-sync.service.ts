import SupabaseService from './supabase.service';
import StorageService from './storage.service';
import { Visit } from '@/types/database.types';
import { SYNC_CONFIG } from '@/config/constants';

// Simple UUID generator for React Native
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

class OfflineSyncService {
  private static instance: OfflineSyncService;
  private syncInProgress = false;
  private syncInterval: any = null;

  private constructor() {}

  public static getInstance(): OfflineSyncService {
    if (!OfflineSyncService.instance) {
      OfflineSyncService.instance = new OfflineSyncService();
    }
    return OfflineSyncService.instance;
  }

  /**
   * Add a visit to the offline queue
   */
  async addToQueue(visit: Omit<Visit, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<string> {
    const pendingVisits = (await StorageService.getPendingVisits()) || [];
    
    const offlineVisit: Visit = {
      ...visit,
      id: generateUUID(),
      offline_id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced: false,
    };

    pendingVisits.push(offlineVisit);
    await StorageService.savePendingVisits(pendingVisits);
    
    return offlineVisit.id;
  }

  /**
   * Sync pending visits to the server
   */
  async syncPendingVisits(): Promise<{ success: number; failed: number }> {
    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return { success: 0, failed: 0 };
    }

    this.syncInProgress = true;
    let successCount = 0;
    let failedCount = 0;

    try {
      const pendingVisits = (await StorageService.getPendingVisits()) || [];
      
      if (pendingVisits.length === 0) {
        console.log('No pending visits to sync');
        return { success: 0, failed: 0 };
      }

      console.log(`Syncing ${pendingVisits.length} pending visits`);

      // Process visits in batches
      for (let i = 0; i < pendingVisits.length; i += SYNC_CONFIG.BATCH_SIZE) {
        const batch = pendingVisits.slice(i, i + SYNC_CONFIG.BATCH_SIZE);
        
        for (const visit of batch) {
          try {
            const { offline_id, synced, ...visitData } = visit;
            const result = await SupabaseService.createVisit(visitData);
            
            if (result) {
              successCount++;
            } else {
              failedCount++;
            }
          } catch (error) {
            console.error('Error syncing visit:', error);
            failedCount++;
          }
        }
      }

      // Remove successfully synced visits
      const remainingVisits = pendingVisits.slice(successCount);
      await StorageService.savePendingVisits(remainingVisits);
      
      // Update last sync time
      await StorageService.saveLastSyncTime(new Date().toISOString());

      console.log(`Sync complete: ${successCount} success, ${failedCount} failed`);
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.syncInProgress = false;
    }

    return { success: successCount, failed: failedCount };
  }

  /**
   * Start automatic sync interval
   */
  startAutoSync(): void {
    if (this.syncInterval) {
      this.stopAutoSync();
    }

    this.syncInterval = setInterval(() => {
      this.syncPendingVisits();
    }, SYNC_CONFIG.AUTO_SYNC_INTERVAL);

    console.log('Auto-sync started');
  }

  /**
   * Stop automatic sync interval
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Auto-sync stopped');
    }
  }

  /**
   * Check if there are pending visits
   */
  async hasPendingVisits(): Promise<boolean> {
    const pendingVisits = await StorageService.getPendingVisits();
    return pendingVisits ? pendingVisits.length > 0 : false;
  }

  /**
   * Get count of pending visits
   */
  async getPendingCount(): Promise<number> {
    const pendingVisits = await StorageService.getPendingVisits();
    return pendingVisits ? pendingVisits.length : 0;
  }

  /**
   * Get last sync time
   */
  async getLastSyncTime(): Promise<string | null> {
    return StorageService.getLastSyncTime();
  }
}

export default OfflineSyncService.getInstance();
