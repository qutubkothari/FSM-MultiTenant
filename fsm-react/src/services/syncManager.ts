/**
 * Offline Sync Manager
 * Handles automatic syncing of offline visits when connection is restored
 */

import { offlineStorage, OfflineVisit } from './offlineStorage';
import { supabase } from './supabase';
import { useTenantStore } from '../store/tenantStore';

class SyncManager {
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private onlineListener: (() => void) | null = null;
  private offlineListener: (() => void) | null = null;
  private syncCompleteCallbacks: Array<(result: { success: number; failed: number }) => void> = [];

  /**
   * Register callback for sync completion
   */
  onSyncComplete(callback: (result: { success: number; failed: number }) => void) {
    this.syncCompleteCallbacks.push(callback);
    return () => {
      this.syncCompleteCallbacks = this.syncCompleteCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Trigger sync complete callbacks
   */
  private triggerSyncComplete(result: { success: number; failed: number }) {
    this.syncCompleteCallbacks.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        console.error('Error in sync complete callback:', error);
      }
    });
  }

  /**
   * Initialize sync manager
   */
  async init() {
    console.log('🔄 Initializing Sync Manager...');
    
    // Initialize offline storage
    await offlineStorage.init();

    // Start periodic sync check
    this.startPeriodicSync();

    // Listen for online/offline events
    this.setupNetworkListeners();

    // Check if there are pending visits on startup
    const pendingCount = await offlineStorage.getPendingCount();
    if (pendingCount > 0) {
      console.log(`📤 Found ${pendingCount} pending visits on startup`);
      if (navigator.onLine) {
        this.syncPendingVisits();
      }
    }
  }

  /**
   * Setup network status listeners
   */
  private setupNetworkListeners() {
    this.onlineListener = () => {
      console.log('🌐 Connection restored - starting sync...');
      this.syncPendingVisits();
    };

    this.offlineListener = () => {
      console.log('📡 Connection lost - offline mode activated');
    };

    window.addEventListener('online', this.onlineListener);
    window.addEventListener('offline', this.offlineListener);
  }

  /**
   * Start periodic sync (every 30 seconds)
   */
  private startPeriodicSync() {
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.syncPendingVisits();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop sync manager
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.onlineListener) {
      window.removeEventListener('online', this.onlineListener);
    }

    if (this.offlineListener) {
      window.removeEventListener('offline', this.offlineListener);
    }

    console.log('⏹️ Sync Manager stopped');
  }

  /**
   * Sync all pending visits
   */
  async syncPendingVisits(): Promise<{ success: number; failed: number }> {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress, skipping...');
      return { success: 0, failed: 0 };
    }

    if (!navigator.onLine) {
      console.log('📡 No internet connection, skipping sync');
      return { success: 0, failed: 0 };
    }

    this.isSyncing = true;
    let successCount = 0;
    let failedCount = 0;

    try {
      const pendingVisits = await offlineStorage.getPendingVisits();
      
      if (pendingVisits.length === 0) {
        console.log('✅ No pending visits to sync');
        return { success: 0, failed: 0 };
      }

      console.log(`🔄 Syncing ${pendingVisits.length} pending visits...`);

      // Sync visits one by one with retry logic
      for (const visit of pendingVisits) {
        try {
          console.log(`🔄 Syncing visit ${visit.id}:`, {
            customer: visit.visitData.customer_name,
            salesman_id: visit.visitData.salesman_id,
            phone: visit.visitData.user_phone,
            hasImage: !!visit.visitData.imageFile
          });
          await this.syncSingleVisit(visit);
          console.log(`✅ Successfully synced visit ${visit.id}`);
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to sync visit ${visit.id}:`, error);
          console.error('Visit data:', visit.visitData);
          failedCount++;
          
          // Update status with error
          await offlineStorage.updateVisitStatus(
            visit.id,
            'failed',
            error instanceof Error ? error.message : 'Unknown error'
          );

          // If too many retries, mark as permanently failed
          if (visit.retryCount >= 5) {
            console.error(`💀 Visit ${visit.id} failed after 5 retries, marking as permanently failed`);
          }
        }

        // Small delay between syncs to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`✅ Sync complete: ${successCount} success, ${failedCount} failed`);
      
      // Trigger callbacks to refresh UI
      if (successCount > 0) {
        this.triggerSyncComplete({ success: successCount, failed: failedCount });
      }
    } catch (error) {
      console.error('❌ Sync error:', error);
    } finally {
      this.isSyncing = false;
    }

    return { success: successCount, failed: failedCount };
  }

  /**
   * Sync a single visit to Supabase
   */
  private async syncSingleVisit(offlineVisit: OfflineVisit): Promise<void> {
    // Mark as syncing
    await offlineStorage.updateVisitStatus(offlineVisit.id, 'syncing');

    const tenantId = useTenantStore.getState().tenant?.id;
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    const { visitData } = offlineVisit;

    // Always get salesman ID from phone
    if (!visitData.user_phone) {
      throw new Error('No phone number in offline visit data');
    }

    const { data: salesman } = await supabase
      .from('salesmen')
      .select('id')
      .eq('phone', visitData.user_phone)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    
    if (!salesman) {
      throw new Error(`Salesman not found for phone ${visitData.user_phone}`);
    }

    const salesmanId = salesman.id;
    console.log(`✅ Found salesman ID: ${salesmanId} for phone: ${visitData.user_phone}`);

    // Convert blob to base64 data URL (same format as online saves)
    let imageDataUrl = null;
    if (visitData.imageBlob) {
      try {
        console.log('📷 Converting image blob to base64...');
        const imageBlob = visitData.imageBlob;
        imageDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(imageBlob);
        });
        console.log('✅ Image converted to base64, size:', imageDataUrl.length);
      } catch (error) {
        console.error('Failed to convert image to base64:', error);
        // Continue without image rather than failing the entire visit
      }
    }

    // Translate fields if they're empty (from offline save)
    let customerName = visitData.customer_name;
    let customerNameAr = visitData.customer_name_ar;
    let contactPerson = visitData.contact_person;
    let contactPersonAr = visitData.contact_person_ar;
    let remarks = visitData.remarks;
    let remarksAr = visitData.remarks_ar;

    // Skip translation for faster sync - can be translated later if needed
    // Translation takes 2-3 seconds per field which makes submit feel slow
    console.log('⚡ Skipping translation during sync for faster performance');

    // Insert visit into database with proper column names
    const { data, error } = await supabase
      .from('visits')
      .insert({
        salesman_id: salesmanId,
        customer_name: customerName,
        customer_name_ar: customerNameAr,
        customer_email: visitData.customer_email || null,
        contact_person: contactPerson,
        contact_person_ar: contactPersonAr,
        visit_type: visitData.visit_type,
        customer_type: visitData.customer_type || null,
        meeting_type: visitData.meeting_type,
        products_discussed: visitData.products_discussed || [],
        next_action: visitData.next_action || null,
        next_action_date: visitData.next_action_date,
        potential: visitData.potential || 'Medium',
        competitor_name: visitData.competitor_name || null,
        can_be_switched: visitData.can_be_switched || null,
        remarks: remarks,
        remarks_ar: remarksAr,
        location_lat: visitData.location_lat,
        location_lng: visitData.location_lng,
        time_in: visitData.check_in_time || new Date().toISOString(),
        time_out: null,
        visit_image: imageDataUrl,
        order_value: visitData.order_value || 0,
        plant: visitData.plant || [],
        status: 'completed',
        tenant_id: tenantId,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Database insert error:', error);
      throw error;
    }

    console.log(`✅ Successfully synced visit ${offlineVisit.id} -> ${data.id}`);

    // Mark as synced and delete from offline storage
    await offlineStorage.updateVisitStatus(offlineVisit.id, 'synced');
    await offlineStorage.deleteVisit(offlineVisit.id);
  }

  /**
   * Force sync now (called manually by user)
   */
  async forceSyncNow(): Promise<{ success: number; failed: number }> {
    console.log('🔄 Force sync triggered by user');
    return await this.syncPendingVisits();
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    pendingCount: number;
    isSyncing: boolean;
    isOnline: boolean;
  }> {
    const pendingCount = await offlineStorage.getPendingCount();
    return {
      pendingCount,
      isSyncing: this.isSyncing,
      isOnline: navigator.onLine,
    };
  }
}

export const syncManager = new SyncManager();
