import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  SALESMAN: '@salesman',
  PENDING_VISITS: '@pending_visits',
  CACHED_CUSTOMERS: '@cached_customers',
  CACHED_PRODUCTS: '@cached_products',
  LAST_SYNC_TIME: '@last_sync_time',
  SETTINGS: '@settings',
};

class StorageService {
  private static instance: StorageService;

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Generic save method
   */
  async save<T>(key: string, value: T): Promise<boolean> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
      return true;
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      return false;
    }
  }

  /**
   * Generic get method
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error(`Error getting ${key}:`, error);
      return null;
    }
  }

  /**
   * Generic remove method
   */
  async remove(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all storage
   */
  async clear(): Promise<boolean> {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }

  // Convenience methods for common operations
  async saveSalesman(salesman: any): Promise<boolean> {
    return this.save(STORAGE_KEYS.SALESMAN, salesman);
  }

  async getSalesman(): Promise<any | null> {
    return this.get(STORAGE_KEYS.SALESMAN);
  }

  async removeSalesman(): Promise<boolean> {
    return this.remove(STORAGE_KEYS.SALESMAN);
  }

  async savePendingVisits(visits: any[]): Promise<boolean> {
    return this.save(STORAGE_KEYS.PENDING_VISITS, visits);
  }

  async getPendingVisits(): Promise<any[] | null> {
    return this.get(STORAGE_KEYS.PENDING_VISITS);
  }

  async cacheCustomers(customers: any[]): Promise<boolean> {
    return this.save(STORAGE_KEYS.CACHED_CUSTOMERS, customers);
  }

  async getCachedCustomers(): Promise<any[] | null> {
    return this.get(STORAGE_KEYS.CACHED_CUSTOMERS);
  }

  async cacheProducts(products: any[]): Promise<boolean> {
    return this.save(STORAGE_KEYS.CACHED_PRODUCTS, products);
  }

  async getCachedProducts(): Promise<any[] | null> {
    return this.get(STORAGE_KEYS.CACHED_PRODUCTS);
  }

  async saveLastSyncTime(time: string): Promise<boolean> {
    return this.save(STORAGE_KEYS.LAST_SYNC_TIME, time);
  }

  async getLastSyncTime(): Promise<string | null> {
    return this.get(STORAGE_KEYS.LAST_SYNC_TIME);
  }
}

export default StorageService.getInstance();
export { STORAGE_KEYS };
