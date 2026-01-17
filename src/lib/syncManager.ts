// Sync Manager for handling offline changes and auto-sync

import { addItem, updateItem, deleteItem, getAllItems, clearStore } from "./indexedDB";

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
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.syncAll();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
    });
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
    // NOTE: This is a placeholder for server sync
    // In a real app, this would make an API call to your backend server
    // For offline-first operation, data is already saved in IndexedDB
    // This method can be extended to sync with a remote server when online
    
    // Placeholder: Store sync actions in localStorage for demonstration
    // In production, replace this with actual API calls
    try {
    const serverKey = `server_${action.store}`;
    const serverData = JSON.parse(localStorage.getItem(serverKey) || "[]");

    switch (action.type) {
      case "create":
        serverData.push(action.data);
        break;
      case "update":
        const updateIndex = serverData.findIndex((item: any) => item.id === action.data.id);
        if (updateIndex !== -1) {
          serverData[updateIndex] = action.data;
        } else {
          serverData.push(action.data);
        }
        break;
      case "delete":
        const deleteIndex = serverData.findIndex((item: any) => item.id === action.data.id);
        if (deleteIndex !== -1) {
          serverData.splice(deleteIndex, 1);
        }
        break;
    }

    localStorage.setItem(serverKey, JSON.stringify(serverData));
    } catch (error) {
      // If sync fails, it's okay - data is already saved locally in IndexedDB
      console.warn("Sync action failed (data is still saved locally):", error);
      throw error; // Re-throw so it can be retried later
    }

    // Mark as synced if it has an id (was queued)
    if (action.id !== undefined) {
      await this.markAsSynced(action.id);
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
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;

    try {
      const queue = await getAllItems<SyncAction>("syncQueue");
      const pendingActions = queue.filter((action) => !action.synced);

      for (const action of pendingActions) {
        try {
          await this.syncAction(action);
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
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
