// Sync Manager for handling offline changes and auto-sync

import { addItem, updateItem, deleteItem, getAllItems, clearStore } from "./indexedDB";
import { productApi, saleApi, clientApi, scheduleApi } from "./api";

export interface SyncAction {
  id?: number;
  type: "create" | "update" | "delete";
  store: string;
  data: any;
  timestamp: number;
  synced: boolean;
}

export class SyncManager {
  private static instance: SyncManager;
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;

  private constructor() {
    this.setupOnlineOfflineListeners();
  }

  public static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  private setupOnlineOfflineListeners() {
    const handleOnline = () => {
      this.isOnline = true;
      // Small delay to ensure network is fully restored
      setTimeout(() => {
        this.syncAll().catch((error) => {
          console.log("Auto-sync on network restore failed:", error);
        });
      }, 1000);
    };

    const handleOffline = () => {
      this.isOnline = false;
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Also check periodically if we're online (in case event listeners don't fire)
    setInterval(() => {
      const currentlyOnline = navigator.onLine;
      if (currentlyOnline && !this.isOnline) {
        // Network was restored but event didn't fire
        handleOnline();
      } else if (!currentlyOnline && this.isOnline) {
        // Network was lost but event didn't fire
        handleOffline();
      }
    }, 5000); // Check every 5 seconds
  }

  public getIsOnline(): boolean {
    return this.isOnline;
  }

  // Add action to sync queue
  public async queueAction(action: Omit<SyncAction, "id" | "timestamp" | "synced">): Promise<void> {
    const syncAction: SyncAction = {
      ...action,
      timestamp: Date.now(),
      synced: false,
    };

    // Always queue first to get an ID (for syncQueue, ID is auto-generated)
    const queuedAction = await addItem<SyncAction>("syncQueue", syncAction);
    
    // If online, try to sync immediately
    if (this.isOnline && queuedAction.id) {
      try {
        await this.syncAction(queuedAction);
        // Mark as synced after successful sync
        await this.markAsSynced(queuedAction.id);
        return;
      } catch (error) {
        console.log("Failed to sync immediately, will retry later:", error);
      }
    }
  }

  // Sync a single action
  private async syncAction(action: SyncAction): Promise<void> {
    // Sync with backend API
    try {
      const itemData = { ...action.data };
      const localId = (itemData as any)._id || (itemData as any).id;
      // Remove id if it exists (backend will generate _id)
      delete (itemData as any).id;
      delete (itemData as any)._id;

      let response: any = null;

      switch (action.type) {
        case "create":
          if (action.store === "products") {
            response = await productApi.create(itemData);
          } else if (action.store === "sales") {
            response = await saleApi.create(itemData);
          } else if (action.store === "clients") {
            response = await clientApi.create(itemData);
          } else if (action.store === "schedules") {
            response = await scheduleApi.create(itemData);
          }
          break;
        case "update":
          const itemId = action.data._id || action.data.id;
          if (!itemId) {
            throw new Error("Item ID is required for update");
          }
          if (action.store === "products") {
            response = await productApi.update(itemId.toString(), itemData);
          } else if (action.store === "sales") {
            response = await saleApi.update(itemId.toString(), itemData);
          } else if (action.store === "clients") {
            response = await clientApi.update(itemId.toString(), itemData);
          } else if (action.store === "schedules") {
            response = await scheduleApi.update(itemId.toString(), itemData);
          }
          break;
        case "delete":
          const deleteId = action.data._id || action.data.id;
          if (!deleteId) {
            throw new Error("Item ID is required for delete");
          }
          if (action.store === "products") {
            await productApi.delete(deleteId.toString());
          } else if (action.store === "sales") {
            await saleApi.delete(deleteId.toString());
          } else if (action.store === "clients") {
            await clientApi.delete(deleteId.toString());
          } else if (action.store === "schedules") {
            await scheduleApi.delete(deleteId.toString());
          }
          break;
      }

      // Update IndexedDB with server response for create/update operations
      if (response?.data && (action.type === "create" || action.type === "update")) {
        const syncedItem = response.data;
        // Map _id to id for compatibility
        if (syncedItem._id && !syncedItem.id) {
          syncedItem.id = syncedItem._id;
        }
        
        // For create operations, find and remove the local item with temporary ID
        if (action.type === "create") {
          const existingItems = await getAllItems(action.store);
          // Try to find the local item by matching content (for sales: product, date, quantity)
          const matchingLocalItem = existingItems.find((localItem: any) => {
            if (action.store === "sales") {
              const localSale = localItem;
              const syncedSale = syncedItem;
              // Match by product name, date, and quantity
              return localSale.product === syncedSale.product &&
                     localSale.date === syncedSale.date &&
                     localSale.quantity === syncedSale.quantity &&
                     Math.abs((localSale.revenue || 0) - (syncedSale.revenue || 0)) < 0.01;
            } else {
              // For other stores, try to match by the original local ID stored in action.data
              const originalLocalId = (action.data as any)._id || (action.data as any).id;
              const currentId = (localItem as any)._id || (localItem as any).id;
              return currentId === originalLocalId;
            }
          });
          
          if (matchingLocalItem) {
            // Remove the local item with temporary ID
            const localId = (matchingLocalItem as any)._id || (matchingLocalItem as any).id;
            const numericId = typeof localId === 'string' ? parseInt(localId) : localId;
            if (!isNaN(numericId)) {
              await deleteItem(action.store, numericId);
            }
          }
        }
        
        // Add/update the synced item with server ID
        await updateItem(action.store, syncedItem);
      }

      // Mark as synced if it has an id (was queued)
      if (action.id !== undefined) {
        await this.markAsSynced(action.id);
      }
    } catch (error) {
      // If sync fails, it's okay - data is already saved locally in IndexedDB
      // Silently fail - don't show errors to users
      console.log("Sync action failed (data is still saved locally):", error);
      throw error; // Re-throw so it can be retried later
    }
  }

  // Mark action as synced
  private async markAsSynced(actionId: number): Promise<void> {
    try {
      const action = await getAllItems<SyncAction>("syncQueue");
      const toUpdate = action.find((a) => a.id === actionId);
      if (toUpdate) {
        toUpdate.synced = true;
        await updateItem("syncQueue", toUpdate);
      }
    } catch (error) {
      console.error("Error marking as synced:", error);
    }
  }

  // Sync all pending actions
  public async syncAll(): Promise<void> {
    // Double-check online status
    if (!navigator.onLine) {
      this.isOnline = false;
      return;
    }

    if (this.syncInProgress) {
      return;
    }

    this.isOnline = true;
    this.syncInProgress = true;

    try {
      const queue = await getAllItems<SyncAction>("syncQueue");
      const pendingActions = queue.filter((action) => !action.synced);

      if (pendingActions.length === 0) {
        return; // Nothing to sync
      }

      console.log(`Syncing ${pendingActions.length} pending action(s)...`);

      for (const action of pendingActions) {
        try {
          // Check online status before each sync
          if (!navigator.onLine) {
            this.isOnline = false;
            break; // Stop syncing if network is lost
          }
          await this.syncAction(action);
          console.log(`Successfully synced ${action.type} action for ${action.store}`);
        } catch (error) {
          console.log(`Failed to sync action ${action.id}, will retry later:`, error);
          // Continue with next action instead of stopping
        }
      }

      // Clean up synced actions (keep last 100 for debugging)
      const allActions = await getAllItems<SyncAction>("syncQueue");
      const syncedActions = allActions.filter((a) => a.synced);
      if (syncedActions.length > 100) {
        const toKeep = syncedActions.slice(-100);
        await clearStore("syncQueue");
        for (const action of toKeep) {
          await addItem("syncQueue", action);
        }
      }
    } catch (error) {
      console.error("Error during sync:", error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Get sync status
  public async getSyncStatus(): Promise<{ pending: number; lastSync: number | null }> {
    try {
      const queue = await getAllItems<SyncAction>("syncQueue");
      const pending = queue.filter((a) => !a.synced).length;
      const synced = queue.filter((a) => a.synced);
      const lastSync = synced.length > 0 
        ? Math.max(...synced.map((a) => a.timestamp)) 
        : null;

      return { pending, lastSync };
    } catch (error) {
      console.error("Error getting sync status:", error);
      return { pending: 0, lastSync: null };
    }
  }
}

// Export getSyncStatus function for use in hooks
export async function getSyncStatus(): Promise<{ pending: number; lastSync: number | null }> {
  const syncManager = SyncManager.getInstance();
  return syncManager.getSyncStatus();
}
