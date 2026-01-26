// Comprehensive offline storage utility using both IndexedDB and localStorage
// IndexedDB for large data (products, sales, clients, schedules)
// localStorage for small data (user settings, preferences, auth tokens)

import { initDB, getAllItems, addItem, updateItem, deleteItem, clearStore, clearAllStores } from "./indexedDB";

// localStorage keys
const STORAGE_KEYS = {
  USER_ID: "profit-pilot-user-id",
  USER_NAME: "profit-pilot-user-name",
  USER_EMAIL: "profit-pilot-user-email",
  BUSINESS_NAME: "profit-pilot-business-name",
  IS_ADMIN: "profit-pilot-is-admin",
  PIN: "profit-pilot-pin",
  THEME: "profit-pilot-theme",
  LANGUAGE: "profit-pilot-language",
  LAST_SYNC: "profit-pilot-last-sync",
  OFFLINE_MODE: "profit-pilot-offline-mode",
} as const;

export class OfflineStorage {
  // ============ localStorage Operations ============
  
  static setUserData(userData: {
    id?: string;
    name?: string;
    email?: string;
    businessName?: string;
    isAdmin?: boolean;
  }): void {
    if (userData.id) localStorage.setItem(STORAGE_KEYS.USER_ID, userData.id);
    if (userData.name) localStorage.setItem(STORAGE_KEYS.USER_NAME, userData.name);
    if (userData.email) localStorage.setItem(STORAGE_KEYS.USER_EMAIL, userData.email);
    if (userData.businessName) localStorage.setItem(STORAGE_KEYS.BUSINESS_NAME, userData.businessName);
    if (userData.isAdmin !== undefined) {
      localStorage.setItem(STORAGE_KEYS.IS_ADMIN, String(userData.isAdmin));
    }
  }

  static getUserData(): {
    id: string | null;
    name: string | null;
    email: string | null;
    businessName: string | null;
    isAdmin: boolean;
  } {
    return {
      id: localStorage.getItem(STORAGE_KEYS.USER_ID),
      name: localStorage.getItem(STORAGE_KEYS.USER_NAME),
      email: localStorage.getItem(STORAGE_KEYS.USER_EMAIL),
      businessName: localStorage.getItem(STORAGE_KEYS.BUSINESS_NAME),
      isAdmin: localStorage.getItem(STORAGE_KEYS.IS_ADMIN) === "true",
    };
  }

  static clearUserData(): void {
    Object.values(STORAGE_KEYS).forEach((key) => {
      if (key !== STORAGE_KEYS.PIN) { // Keep PIN for security
        localStorage.removeItem(key);
      }
    });
  }

  static setLastSync(timestamp: number): void {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, String(timestamp));
  }

  static getLastSync(): number | null {
    const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    return lastSync ? parseInt(lastSync, 10) : null;
  }

  static setOfflineMode(enabled: boolean): void {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_MODE, String(enabled));
  }

  static isOfflineMode(): boolean {
    return localStorage.getItem(STORAGE_KEYS.OFFLINE_MODE) === "true";
  }

  // ============ IndexedDB Operations ============

  static async saveToIndexedDB<T extends { id?: number; _id?: string }>(
    storeName: string,
    items: T[]
  ): Promise<void> {
    try {
      await initDB();
      // Clear existing data for this store
      await clearStore(storeName);
      // Add all items
      for (const item of items) {
        // Ensure item has an id (use _id if id doesn't exist)
        const itemWithId = { ...item };
        if (!itemWithId.id && itemWithId._id) {
          itemWithId.id = itemWithId._id as any;
        }
        await addItem(storeName, itemWithId);
      }
    } catch (error) {
      console.error(`Error saving to IndexedDB (${storeName}):`, error);
      throw error;
    }
  }

  static async loadFromIndexedDB<T>(storeName: string): Promise<T[]> {
    try {
      await initDB();
      return await getAllItems<T>(storeName);
    } catch (error) {
      console.error(`Error loading from IndexedDB (${storeName}):`, error);
      return [];
    }
  }

  static async addToIndexedDB<T extends { id?: number; _id?: string }>(
    storeName: string,
    item: T
  ): Promise<T> {
    try {
      await initDB();
      // Ensure item has an id
      const itemWithId = { ...item };
      if (!itemWithId.id && itemWithId._id) {
        itemWithId.id = itemWithId._id as any;
      }
      return await addItem(storeName, itemWithId);
    } catch (error) {
      console.error(`Error adding to IndexedDB (${storeName}):`, error);
      throw error;
    }
  }

  static async updateInIndexedDB<T extends { id?: number; _id?: string }>(
    storeName: string,
    item: T
  ): Promise<void> {
    try {
      await initDB();
      // Ensure item has an id
      const itemWithId = { ...item };
      if (!itemWithId.id && itemWithId._id) {
        itemWithId.id = itemWithId._id as any;
      }
      await updateItem(storeName, itemWithId);
    } catch (error) {
      console.error(`Error updating in IndexedDB (${storeName}):`, error);
      throw error;
    }
  }

  static async deleteFromIndexedDB(
    storeName: string,
    id: number | string
  ): Promise<void> {
    try {
      await initDB();
      const numericId = typeof id === "string" ? parseInt(id, 10) : id;
      if (!isNaN(numericId)) {
        await deleteItem(storeName, numericId);
      }
    } catch (error) {
      console.error(`Error deleting from IndexedDB (${storeName}):`, error);
      throw error;
    }
  }

  // ============ Backup and Restore ============

  static async backupAllData(): Promise<{
    userData: ReturnType<typeof OfflineStorage.getUserData>;
    products: any[];
    sales: any[];
    clients: any[];
    schedules: any[];
    timestamp: number;
  }> {
    try {
      const userData = this.getUserData();
      const products = await this.loadFromIndexedDB("products");
      const sales = await this.loadFromIndexedDB("sales");
      const clients = await this.loadFromIndexedDB("clients");
      const schedules = await this.loadFromIndexedDB("schedules");

      return {
        userData,
        products,
        sales,
        clients,
        schedules,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("Error backing up data:", error);
      throw error;
    }
  }

  static async restoreAllData(backup: {
    userData: ReturnType<typeof OfflineStorage.getUserData>;
    products?: any[];
    sales?: any[];
    clients?: any[];
    schedules?: any[];
  }): Promise<void> {
    try {
      // Restore user data
      if (backup.userData) {
        this.setUserData(backup.userData);
      }

      // Restore IndexedDB data
      if (backup.products) {
        await this.saveToIndexedDB("products", backup.products);
      }
      if (backup.sales) {
        await this.saveToIndexedDB("sales", backup.sales);
      }
      if (backup.clients) {
        await this.saveToIndexedDB("clients", backup.clients);
      }
      if (backup.schedules) {
        await this.saveToIndexedDB("schedules", backup.schedules);
      }
    } catch (error) {
      console.error("Error restoring data:", error);
      throw error;
    }
  }

  // ============ Clear All Data ============

  static async clearAllData(): Promise<void> {
    try {
      // Clear localStorage
      this.clearUserData();
      
      // Clear IndexedDB
      await clearAllStores();
    } catch (error) {
      console.error("Error clearing all data:", error);
      throw error;
    }
  }

  // ============ Health Check ============

  static async checkStorageHealth(): Promise<{
    indexedDB: boolean;
    localStorage: boolean;
    canWrite: boolean;
  }> {
    const health = {
      indexedDB: false,
      localStorage: false,
      canWrite: false,
    };

    // Check IndexedDB
    try {
      await initDB();
      health.indexedDB = true;
    } catch (error) {
      console.error("IndexedDB health check failed:", error);
    }

    // Check localStorage
    try {
      const testKey = "__storage_test__";
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      health.localStorage = true;
    } catch (error) {
      console.error("localStorage health check failed:", error);
    }

    health.canWrite = health.indexedDB && health.localStorage;
    return health;
  }
}
