// Hook for using localStorage with IndexedDB backup for offline support

import { useState, useEffect } from "react";
import { SyncManager } from "@/lib/syncManager";
import {
  getAllItems,
  addItem,
  updateItem,
  deleteItem,
  clearStore,
  initDB,
} from "@/lib/indexedDB";
import { getNextId } from "@/lib/idGenerator";

type StoreName = "products" | "sales" | "settings";

interface UseLocalStorageOptions<T> {
  storeName: StoreName;
  defaultValue: T[];
  onSync?: (items: T[]) => Promise<void> | void;
}

export function useLocalStorage<T extends { id: number }>({
  storeName,
  defaultValue,
  onSync,
}: UseLocalStorageOptions<T>) {
  const [items, setItems] = useState<T[]>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const syncManager = SyncManager.getInstance();

  // Initialize DB and load data
  useEffect(() => {
    const loadData = async () => {
      try {
        await initDB();
        const stored = await getAllItems<T>(storeName);

        if (stored.length > 0) {
          setItems(stored);
        } else {
          // If no stored data, use default and save it
          for (const item of defaultValue) {
            await addItem(storeName, item);
          }
          setItems(defaultValue);
        }

        // Try to sync if online (optional callback for server sync)
        if (syncManager.getIsOnline() && onSync) {
          try {
            const result = onSync(stored.length > 0 ? stored : defaultValue);
            if (result instanceof Promise) {
              await result;
            }
          } catch (error) {
            console.error("Sync callback failed:", error);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setItems(defaultValue);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Add item
  const add = async (item: T): Promise<void> => {
    try {
      // Ensure item has a unique ID if not provided or if ID collision detected
      let itemToAdd = { ...item };
      
      // If no ID or ID already exists, generate a new unique one
      if (!itemToAdd.id || items.some(i => i.id === itemToAdd.id)) {
        itemToAdd.id = await getNextId(items);
      }
      
      // Add to IndexedDB first (primary storage)
      await addItem(storeName, itemToAdd);
      
      // Update local state with the item that has the correct ID
      setItems((prev) => [...prev, itemToAdd]);

      // Queue for sync (non-blocking, works offline)
      syncManager.queueAction({
        type: "create",
        store: storeName,
        data: itemToAdd,
      }).catch((error) => {
        // Queue failures are not critical - data is already saved locally
        console.warn("Failed to queue sync action:", error);
      });

      // Try immediate sync if online (non-blocking)
      if (syncManager.getIsOnline()) {
        syncManager.syncAll().catch((error) => {
          // Sync failures are not critical - data is saved locally
          console.warn("Failed to sync immediately:", error);
        });
      }
    } catch (error) {
      console.error("Error adding item:", error);
      throw error;
    }
  };

  // Update item
  const update = async (item: T): Promise<void> => {
    try {
      // Update in IndexedDB (primary storage)
      await updateItem(storeName, item);

      // Update local state
      setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));

      // Queue for sync (non-blocking)
      syncManager.queueAction({
        type: "update",
        store: storeName,
        data: item,
      }).catch((error) => {
        console.warn("Failed to queue sync action:", error);
      });

      // Try immediate sync if online (non-blocking)
      if (syncManager.getIsOnline()) {
        syncManager.syncAll().catch((error) => {
          console.warn("Failed to sync immediately:", error);
        });
      }
    } catch (error) {
      console.error("Error updating item:", error);
      throw error;
    }
  };

  // Delete item
  const remove = async (id: number): Promise<void> => {
    try {
      const item = items.find((i) => i.id === id);
      if (!item) return;

      // Delete from IndexedDB (primary storage)
      await deleteItem(storeName, id);

      // Update local state
      setItems((prev) => prev.filter((i) => i.id !== id));

      // Queue for sync (non-blocking)
      syncManager.queueAction({
        type: "delete",
        store: storeName,
        data: { id },
      }).catch((error) => {
        console.warn("Failed to queue sync action:", error);
      });

      // Try immediate sync if online (non-blocking)
      if (syncManager.getIsOnline()) {
        syncManager.syncAll().catch((error) => {
          console.warn("Failed to sync immediately:", error);
        });
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      throw error;
    }
  };

  // Bulk add
  const bulkAdd = async (newItems: T[]): Promise<void> => {
    try {
      const itemsToAdd: T[] = [];
      let currentItems = items;
      
      // Process each item and ensure unique IDs
      for (const item of newItems) {
        let itemToAdd = { ...item };
        
        // If no ID or ID already exists, generate a new unique one
        if (!itemToAdd.id || currentItems.some(i => i.id === itemToAdd.id) || itemsToAdd.some(i => i.id === itemToAdd.id)) {
          itemToAdd.id = await getNextId([...currentItems, ...itemsToAdd]);
        }
        
        // Add to IndexedDB (primary storage)
        await addItem(storeName, itemToAdd);
        itemsToAdd.push(itemToAdd);
        currentItems = [...currentItems, itemToAdd];
        
        // Queue for sync (non-blocking)
        syncManager.queueAction({
          type: "create",
          store: storeName,
          data: itemToAdd,
        }).catch((error) => {
          console.warn("Failed to queue sync action:", error);
        });
      }

      // Update local state with all items that have correct IDs
      setItems((prev) => [...prev, ...itemsToAdd]);

      // Try immediate sync if online (non-blocking)
      if (syncManager.getIsOnline()) {
        syncManager.syncAll().catch((error) => {
          console.warn("Failed to sync immediately:", error);
        });
      }
    } catch (error) {
      console.error("Error bulk adding items:", error);
      throw error;
    }
  };

  // Set all items (replace)
  const setAll = async (newItems: T[]): Promise<void> => {
    try {
      await clearStore(storeName);
      for (const item of newItems) {
        await addItem(storeName, item);
      }
      setItems(newItems);

      // Queue all as updates
      for (const item of newItems) {
        await syncManager.queueAction({
          type: "update",
          store: storeName,
          data: item,
        });
      }

      // Try immediate sync if online
      if (syncManager.getIsOnline()) {
        await syncManager.syncAll();
      }
    } catch (error) {
      console.error("Error setting all items:", error);
      throw error;
    }
  };

  return {
    items,
    isLoading,
    add,
    update,
    remove,
    bulkAdd,
    setAll,
    setItems, // Direct state setter for compatibility
  };
}
