/**
 * Offline Storage Service using IndexedDB
 * Stores visits locally when offline and syncs when online
 */

const DB_NAME = 'FSM_OfflineDB';
const DB_VERSION = 1;
const VISITS_STORE = 'offline_visits';
const SYNC_QUEUE_STORE = 'sync_queue';

interface OfflineVisit {
  id: string; // Temporary ID for offline visit
  visitData: any; // Complete visit data
  timestamp: number; // When it was saved offline
  syncStatus: 'pending' | 'syncing' | 'failed' | 'synced';
  retryCount: number;
  lastError?: string;
}

class OfflineStorageService {
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('❌ Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create visits store
        if (!db.objectStoreNames.contains(VISITS_STORE)) {
          const visitStore = db.createObjectStore(VISITS_STORE, { keyPath: 'id' });
          visitStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          visitStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('📦 Created offline_visits store');
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
          db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
          console.log('📦 Created sync_queue store');
        }
      };
    });
  }

  /**
   * Save visit offline
   */
  async saveVisitOffline(visitData: any): Promise<string> {
    if (!this.db) await this.init();

    const offlineVisit: OfflineVisit = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      visitData,
      timestamp: Date.now(),
      syncStatus: 'pending',
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([VISITS_STORE], 'readwrite');
      const store = transaction.objectStore(VISITS_STORE);
      const request = store.add(offlineVisit);

      request.onsuccess = () => {
        console.log('💾 Visit saved offline:', offlineVisit.id);
        resolve(offlineVisit.id);
      };

      request.onerror = () => {
        console.error('❌ Failed to save offline visit:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all pending visits to sync
   */
  async getPendingVisits(): Promise<OfflineVisit[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([VISITS_STORE], 'readonly');
      const store = transaction.objectStore(VISITS_STORE);
      const index = store.index('syncStatus');
      const request = index.getAll('pending');

      request.onsuccess = () => {
        console.log(`📤 Found ${request.result.length} pending visits to sync`);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('❌ Failed to get pending visits:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all offline visits (for display)
   */
  async getAllOfflineVisits(): Promise<OfflineVisit[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([VISITS_STORE], 'readonly');
      const store = transaction.objectStore(VISITS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('❌ Failed to get offline visits:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Update visit sync status
   */
  async updateVisitStatus(
    id: string,
    status: 'pending' | 'syncing' | 'failed' | 'synced',
    error?: string
  ): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([VISITS_STORE], 'readwrite');
      const store = transaction.objectStore(VISITS_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        const visit = request.result;
        if (visit) {
          visit.syncStatus = status;
          if (status === 'failed') {
            visit.retryCount++;
            visit.lastError = error;
          }
          const updateRequest = store.put(visit);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete synced visit
   */
  async deleteVisit(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([VISITS_STORE], 'readwrite');
      const store = transaction.objectStore(VISITS_STORE);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('🗑️ Deleted synced visit:', id);
        resolve();
      };

      request.onerror = () => {
        console.error('❌ Failed to delete visit:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get count of pending visits
   */
  async getPendingCount(): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([VISITS_STORE], 'readonly');
      const store = transaction.objectStore(VISITS_STORE);
      const index = store.index('syncStatus');
      const request = index.count('pending');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all offline data (for testing/reset)
   */
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([VISITS_STORE], 'readwrite');
      const store = transaction.objectStore(VISITS_STORE);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('🧹 Cleared all offline data');
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineStorage = new OfflineStorageService();
export type { OfflineVisit };
