// Hook to manage API data (replaces useLocalStorage for backend integration)
import { useState, useEffect, useCallback, useRef } from "react";
import { productApi, saleApi, clientApi, scheduleApi } from "@/lib/api";

interface UseApiOptions<T> {
  endpoint: 'products' | 'sales' | 'clients' | 'schedules';
  defaultValue: T[];
  onError?: (error: Error) => void;
}

export function useApi<T extends { _id?: string; id?: number }>({
  endpoint,
  defaultValue,
  onError,
}: UseApiOptions<T>) {
  const [items, setItems] = useState<T[]>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const hasErrorShownRef = useRef(false);
  const isLoadingDataRef = useRef(false);

  // Map MongoDB _id to id for compatibility
  const mapItem = useCallback((item: any): T => {
    if (item._id && !item.id) {
      return { ...item, id: item._id };
    }
    return item;
  }, []);

  // Load data from API
  const loadData = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isLoadingDataRef.current) {
      return;
    }

    // Validate userId exists before making API calls (data isolation)
    const userId = localStorage.getItem("profit-pilot-user-id");
    if (!userId) {
      setIsLoading(false);
      setError(new Error('User not authenticated. Please login.'));
      setItems(defaultValue);
      return;
    }

    isLoadingDataRef.current = true;
    setIsLoading(true);
    setError(null);
    hasErrorShownRef.current = false;
    
    // Minimum loading time to prevent flickering (500ms for better UX)
    const startTime = Date.now();
    const minLoadingTime = 500;
    
    try {
      let response;
      if (endpoint === 'products') {
        response = await productApi.getAll();
      } else if (endpoint === 'sales') {
        response = await saleApi.getAll();
      } else if (endpoint === 'clients') {
        response = await clientApi.getAll();
      } else if (endpoint === 'schedules') {
        response = await scheduleApi.getAll();
      } else {
        throw new Error(`Unknown endpoint: ${endpoint}`);
      }
      
      // Verify userId hasn't changed during the request (prevent data leakage)
      const currentUserId = localStorage.getItem("profit-pilot-user-id");
      if (currentUserId !== userId) {
        // User changed during request, clear data for security
        setItems(defaultValue);
        setIsLoading(false);
        return;
      }

      // Calculate remaining time to meet minimum loading duration
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }

      if (response.data) {
        const mappedItems = response.data.map(mapItem);
        setItems(mappedItems.length > 0 ? mappedItems : defaultValue);
      } else {
        setItems(defaultValue);
      }
      setIsLoading(false);
      hasErrorShownRef.current = false; // Reset error flag on success
    } catch (err) {
      // Calculate remaining time to meet minimum loading duration
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }
      
      const error = err instanceof Error ? err : new Error('Failed to load data');
      setError(error);
      
      // Only call onError once per error to prevent spam
      if (onError && !hasErrorShownRef.current) {
        onError(error);
        hasErrorShownRef.current = true;
      }
      
      // Fallback to default value on error
      setItems(defaultValue);
      setIsLoading(false);
    } finally {
      isLoadingDataRef.current = false;
    }
  }, [endpoint, defaultValue, mapItem, onError]);

  // Load data on mount only
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Monitor userId changes and clear data if it changes (data isolation)
  useEffect(() => {
    const checkUserId = () => {
      const currentUserId = localStorage.getItem("profit-pilot-user-id");
      if (!currentUserId && items.length > 0) {
        // User logged out, clear data
        setItems(defaultValue);
      }
    };

    // Check on mount
    checkUserId();

    // Listen for storage changes (userId changes)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "profit-pilot-user-id") {
        checkUserId();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Also check periodically (in case localStorage is changed directly)
    const interval = setInterval(checkUserId, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [items, defaultValue]);

  // Add item
  const add = useCallback(async (item: T): Promise<void> => {
    // Validate userId exists (data isolation)
    const userId = localStorage.getItem("profit-pilot-user-id");
    if (!userId) {
      throw new Error('User not authenticated. Please login.');
    }
    
    try {
      let response;
      const itemData = { ...item };
      // Remove id if it exists (backend will generate _id)
      delete (itemData as any).id;
      delete (itemData as any)._id;

      if (endpoint === 'products') {
        response = await productApi.create(itemData);
      } else if (endpoint === 'sales') {
        response = await saleApi.create(itemData);
      } else if (endpoint === 'clients') {
        response = await clientApi.create(itemData);
      } else if (endpoint === 'schedules') {
        response = await scheduleApi.create(itemData);
      } else {
        throw new Error(`Unknown endpoint: ${endpoint}`);
      }

      if (response.data) {
        const newItem = mapItem(response.data);
        setItems((prev) => [...prev, newItem]);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add item');
      setError(error);
      if (onError) {
        onError(error);
      }
      throw error;
    }
  }, [endpoint, mapItem, onError]);

  // Update item
  const update = useCallback(async (item: T): Promise<void> => {
    // Validate userId exists (data isolation)
    const userId = localStorage.getItem("profit-pilot-user-id");
    if (!userId) {
      throw new Error('User not authenticated. Please login.');
    }
    
    try {
      const itemId = (item as any)._id || (item as any).id;
      if (!itemId) {
        throw new Error('Item ID is required for update');
      }

      const itemData = { ...item };
      delete (itemData as any).id;
      delete (itemData as any)._id;

      let response;
      if (endpoint === 'products') {
        response = await productApi.update(itemId, itemData);
      } else if (endpoint === 'sales') {
        response = await saleApi.update(itemId, itemData);
      } else if (endpoint === 'clients') {
        response = await clientApi.update(itemId, itemData);
      } else if (endpoint === 'schedules') {
        response = await scheduleApi.update(itemId, itemData);
      } else {
        throw new Error(`Unknown endpoint: ${endpoint}`);
      }

      if (response.data) {
        const updatedItem = mapItem(response.data);
        setItems((prev) =>
          prev.map((i) => {
            const currentId = (i as any)._id || (i as any).id;
            return currentId === itemId ? updatedItem : i;
          })
        );
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update item');
      setError(error);
      if (onError) {
        onError(error);
      }
      throw error;
    }
  }, [endpoint, mapItem, onError]);

  // Remove item
  const remove = useCallback(async (item: T): Promise<void> => {
    // Validate userId exists (data isolation)
    const userId = localStorage.getItem("profit-pilot-user-id");
    if (!userId) {
      throw new Error('User not authenticated. Please login.');
    }
    
    try {
      const itemId = (item as any)._id || (item as any).id;
      if (!itemId) {
        throw new Error('Item ID is required for delete');
      }

      if (endpoint === 'products') {
        await productApi.delete(itemId);
      } else if (endpoint === 'sales') {
        await saleApi.delete(itemId);
      } else if (endpoint === 'clients') {
        await clientApi.delete(itemId);
      } else if (endpoint === 'schedules') {
        await scheduleApi.delete(itemId);
      } else {
        throw new Error(`Unknown endpoint: ${endpoint}`);
      }

      setItems((prev) =>
        prev.filter((i) => {
          const currentId = (i as any)._id || (i as any).id;
          return currentId !== itemId;
        })
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete item');
      setError(error);
      if (onError) {
        onError(error);
      }
      throw error;
    }
  }, [endpoint, onError]);

  // Bulk add (for sales)
  const bulkAdd = useCallback(async (itemsToAdd: T[]): Promise<void> => {
    if (endpoint !== 'sales') {
      throw new Error('Bulk add is only available for sales');
    }

    // Validate userId exists (data isolation)
    const userId = localStorage.getItem("profit-pilot-user-id");
    if (!userId) {
      throw new Error('User not authenticated. Please login.');
    }

    try {
      const itemsData = itemsToAdd.map((item) => {
        const itemData = { ...item };
        delete (itemData as any).id;
        delete (itemData as any)._id;
        return itemData;
      });

      const response = await saleApi.createBulk(itemsData);

      if (response.data) {
        const newItems = response.data.map(mapItem);
        setItems((prev) => [...prev, ...newItems]);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to bulk add items');
      setError(error);
      if (onError) {
        onError(error);
      }
      throw error;
    }
  }, [endpoint, mapItem, onError]);

  // Set items (for compatibility)
  const setItemsDirect = useCallback((newItems: T[]) => {
    setItems(newItems);
  }, []);

  // Refresh function that resets error state
  const refresh = useCallback(() => {
    hasErrorShownRef.current = false;
    loadData();
  }, [loadData]);

  return {
    items,
    isLoading,
    error,
    add,
    update,
    remove,
    bulkAdd,
    setItems: setItemsDirect,
    refresh,
  };
}
