// Hook to manage API data (replaces useLocalStorage for backend integration)
import { useState, useEffect, useCallback, useRef } from "react";
import { productApi, saleApi, clientApi, vendorApi, accountApi, categoryBudgetApi, scheduleApi, bookingApi, expenseApi, incomeApi, payrollApi, billApi, taxApi, bankDepositApi, loanApi, invoiceApi, documentApi } from "@/lib/api";
import { SyncManager } from "@/lib/syncManager";
import { tryInitDB, getAllItems, addItem, updateItem, deleteItem, getItem, clearStore } from "@/lib/indexedDB";
import { generateUniqueId } from "@/lib/idGenerator";
import { apiCache } from "@/lib/apiCache";
import { logger } from "@/lib/logger";
import { websocketManager } from "@/lib/websocketManager";
import { patchProductStock } from "@/lib/productStock";
import {
  filterByCurrentScope,
  itemBelongsToCurrentScope,
  getWorkspaceScopeKey,
  STORED_DATA_SCOPE_KEY,
  WORKSPACE_CHANGED_EVENT,
  canAccessEndpointInWorkspace,
} from "@/lib/workspace";
import {
  isRemoteWorkspaceActor,
  matchesRealtimeRecord,
  notifyWorkspaceActivity,
} from "@/lib/workspaceRealtime";
import { useWorkspace } from "@/hooks/useWorkspace";

interface UseApiOptions<T> {
  endpoint: 'products' | 'sales' | 'clients' | 'vendors' | 'accounts' | 'categoryBudgets' | 'schedules' | 'bookings' | 'expenses' | 'incomes' | 'payrolls' | 'bills' | 'taxes' | 'bankDeposits' | 'loans' | 'invoices' | 'documents';
  defaultValue: T[];
  onError?: (error: Error) => void;
}

type DataChangeAction = 'create' | 'update' | 'delete';

type DataChangedDetail = {
  endpoint: string;
  action: DataChangeAction;
  item?: unknown;
  itemId?: string;
};

const DATA_CHANGED_EVENT = 'profit-pilot-data-changed';

function getScopedCacheKey(endpoint: string): string {
  return `/${endpoint}:${getWorkspaceScopeKey()}`;
}

function applyWorkspaceScope<T>(items: T[]): T[] {
  return filterByCurrentScope(items);
}

function getRecordId(record: { _id?: string; id?: number | string }): string | null {
  const id = record._id ?? record.id;
  return id != null ? String(id) : null;
}

function collectRecordIds(record: { _id?: string; id?: number | string }): string[] {
  const ids = new Set<string>();
  const primary = getRecordId(record);
  if (primary) ids.add(primary);
  if (record._id != null) ids.add(String(record._id));
  if (record.id != null) ids.add(String(record.id));
  return [...ids];
}

function recordMatchesDeleteIds(
  record: { _id?: string; id?: number | string },
  deleteIds: Set<string>,
): boolean {
  return collectRecordIds(record).some((id) => deleteIds.has(id));
}

function deduplicateByRecordId<T>(items: T[]): T[] {
  const seen = new Map<string, T>();
  for (const item of items) {
    const id = getRecordId(item as { _id?: string; id?: number | string });
    if (!id) {
      seen.set(`__no_id_${seen.size}`, item);
      continue;
    }
    seen.set(id, item);
  }
  return [...seen.values()];
}

function sortSalesByNewest<T>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aTime = (a as { timestamp?: string; date?: string }).timestamp || (a as { date?: string }).date;
    const bTime = (b as { timestamp?: string; date?: string }).timestamp || (b as { date?: string }).date;
    return new Date(bTime || 0).getTime() - new Date(aTime || 0).getTime();
  });
}

function isMongoServerId(id: unknown): boolean {
  return typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);
}

function isLikelyNetworkError(error: any): boolean {
  return Boolean(
    !navigator.onLine ||
      error?.message?.includes("Failed to fetch") ||
      error?.message?.includes("NetworkError") ||
      error?.message?.includes("Network request failed") ||
      error?.message?.includes("Cannot record sales while offline") ||
      error?.response?.connectionError === true,
  );
}

/** Mirror stock change in IndexedDB (background). UI updates via patchProductStock. */
function mirrorProductStockInIndexedDB(productId: string, delta: number): void {
  void (async () => {
    try {
      await tryInitDB();
      const products = await getAllItems<{ _id?: string; id?: string | number; stock?: number }>("products");
      const product = products.find((p) => (p._id ?? p.id)?.toString() === productId);
      if (!product) return;
      await updateItem("products", {
        ...product,
        stock: Math.max(0, (product.stock ?? 0) + delta),
      });
      apiCache.invalidateStore("products");
    } catch {
      // products may only live in API memory
    }
  })();
}

/** Instant UI stock patch + background IndexedDB mirror (no full refresh). */
function applyProductStockDelta(productId: string, delta: number): void {
  if (!productId || !delta) return;
  patchProductStock(productId, delta);
  mirrorProductStockInIndexedDB(productId, delta);
}

function notifyProductsStockChanged(): void {
  apiCache.invalidateStore("products");
  window.dispatchEvent(new CustomEvent("products-should-refresh"));
}

function salesDedupKey(sale: {
  product?: string;
  serviceName?: string;
  date?: string | Date;
  quantity?: number;
  revenue?: number;
  workerId?: string;
  workerName?: string;
  timestamp?: string;
}): string {
  const dateStr =
    typeof sale.date === "string"
      ? sale.date.split("T")[0]
      : sale.date
        ? new Date(sale.date).toISOString().split("T")[0]
        : "";
  const label = (sale.serviceName || sale.product || "").trim().toLowerCase();
  const worker = (sale.workerId || sale.workerName || "").toString();
  const ts = sale.timestamp || (typeof sale.date === "string" ? sale.date : "");
  const tsSec = ts ? Math.floor(new Date(ts).getTime() / 1000) : "";
  return `${label}_${dateStr}_${sale.quantity ?? 0}_${sale.revenue ?? 0}_${worker}_${tsSec}`;
}

function deduplicateSales<T>(items: T[]): T[] {
  const seen = new Map<string, T>();
  for (const item of items) {
    const sale = item as {
      _id?: string;
      id?: number | string;
      product?: string;
      serviceName?: string;
      date?: string | Date;
      quantity?: number;
      revenue?: number;
      workerId?: string;
      workerName?: string;
      timestamp?: string;
    };
    const key = salesDedupKey(sale);
    if (seen.has(key)) {
      const existing = seen.get(key)!;
      const existingId = (existing as { _id?: string; id?: number | string })._id
        ?? (existing as { id?: number | string }).id;
      const currentId = sale._id ?? sale.id;
      const existingIsServer = isMongoServerId(existingId);
      const currentIsServer = isMongoServerId(currentId);
      if (currentIsServer && !existingIsServer) {
        seen.set(key, item);
      }
    } else {
      seen.set(key, item);
    }
  }
  return sortSalesByNewest(Array.from(seen.values()));
}

function applyCreateToList<T>(prev: T[], item: T, listEndpoint: string): T[] {
  if (listEndpoint === "sales") {
    return deduplicateSales([item, ...prev]);
  }

  const itemId = getRecordId(item as { _id?: string; id?: number });
  const exists = itemId
    ? prev.some((i) => getRecordId(i as { _id?: string; id?: number }) === itemId)
    : false;

  if (exists) {
    return prev.map((i) =>
      getRecordId(i as { _id?: string; id?: number }) === itemId ? item : i,
    );
  }
  return [...prev, item];
}

function applyUpdateToList<T>(prev: T[], item: T): T[] {
  const itemId = getRecordId(item as { _id?: string; id?: number });
  if (!itemId) return prev;
  const exists = prev.some((i) => getRecordId(i as { _id?: string; id?: number }) === itemId);
  if (!exists) return [...prev, item];
  return prev.map((i) =>
    getRecordId(i as { _id?: string; id?: number }) === itemId ? item : i,
  );
}

function dispatchDataChanged(detail: DataChangedDetail) {
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail }));
}

export function useApi<T extends { _id?: string; id?: number }>({
  endpoint,
  defaultValue,
  onError,
}: UseApiOptions<T>) {
  const { mode, activeWorkspace, canAccessPage } = useWorkspace();
  const [items, setItems] = useState<T[]>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const hasErrorShownRef = useRef(false);
  const isLoadingDataRef = useRef(false);
  const pendingLoadRef = useRef<{ silent?: boolean; force?: boolean } | null>(null);
  const itemsRef = useRef<T[]>(defaultValue);
  const syncManager = SyncManager.getInstance();
  /** Sales deleted locally; stale in-flight GETs may still include these rows — filter until server catches up */
  const pendingDeletedIdsRef = useRef<Set<string>>(new Set());

  // Map MongoDB _id to id for compatibility
  const mapItem = useCallback((item: any): T => {
    if (item._id && !item.id) {
      return { ...item, id: item._id };
    }
    return item;
  }, []);

  /** Remove pending-deleted sales rows and prune IDs once server no longer returns them */
  const reconcileListWithPendingDeletions = useCallback((mappedItems: T[]): T[] => {
    const pending = pendingDeletedIdsRef.current;
    if (pending.size === 0) return mappedItems;
    const idsInResponse = new Set(
      mappedItems.flatMap((item) => collectRecordIds(item as { _id?: string; id?: number | string })),
    );
    for (const id of [...pending]) {
      if (!idsInResponse.has(id)) pending.delete(id);
    }
    return deduplicateByRecordId(
      mappedItems.filter(
        (item) => !recordMatchesDeleteIds(item as { _id?: string; id?: number | string }, pending),
      ),
    );
  }, []);

  // Load data from IndexedDB first, then try to sync with API
  // silent: if true, skip setting isLoading (keeps existing data visible during background refresh)
  const loadData = useCallback(async (options?: { silent?: boolean; force?: boolean }) => {
    const silent = options?.silent || false;
    const force = options?.force || false;
    
    // Prevent multiple simultaneous requests (queue forced refresh if one is already running)
    if (isLoadingDataRef.current) {
      if (force) {
        pendingLoadRef.current = { silent: true, force: true };
      }
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

    const hasEndpointAccess = canAccessEndpointInWorkspace(
      mode,
      activeWorkspace?.role ?? null,
      activeWorkspace?.permissions ?? [],
      endpoint,
    );
    const hasDashboardReadAccess =
      mode === 'workspace' && canAccessPage('dashboard');
    if (!hasEndpointAccess && !hasDashboardReadAccess) {
      setItems(defaultValue);
      setIsLoading(false);
      isLoadingDataRef.current = false;
      return;
    }

    isLoadingDataRef.current = true;
    if (!silent) {
      setIsLoading(true);
    }
    setError(null);
    hasErrorShownRef.current = false;
    
    // Minimum loading time to prevent flickering (500ms for better UX)
    // Skip for silent refreshes (data already visible on screen)
    const startTime = Date.now();
    const minLoadingTime = silent ? 0 : 500;
    
    try {
      // Initialize IndexedDB (optional — app falls back to API if unavailable)
      await tryInitDB();
      
      const storeName = endpoint;
      const isSalesEndpoint = endpoint === 'sales';
      
      // Check if stored userId matches current userId - clear IndexedDB if different
      const storedUserId = localStorage.getItem("profit-pilot-stored-user-id");
      if (storedUserId && storedUserId !== userId) {
        // User changed - clear all IndexedDB stores to prevent data leakage
        try {
          await clearStore(storeName);
          // Clear cache as well
          const cacheKey = getScopedCacheKey(endpoint);
          apiCache.invalidate(cacheKey);
        } catch (clearError) {
          // Log but don't fail - continue with API fetch
          console.warn("Error clearing IndexedDB on user change:", clearError);
        }
      }
      // Store current userId for future checks
      localStorage.setItem("profit-pilot-stored-user-id", userId);

      const currentScope = getWorkspaceScopeKey();
      const storedScope = localStorage.getItem(STORED_DATA_SCOPE_KEY);
      if (storedScope && storedScope !== currentScope) {
        try {
          await clearStore(storeName);
          apiCache.invalidate(getScopedCacheKey(endpoint));
          setItems(defaultValue);
        } catch (clearError) {
          console.warn("Error clearing IndexedDB on workspace scope change:", clearError);
        }
      }
      localStorage.setItem(STORED_DATA_SCOPE_KEY, currentScope);
      
      // ✅ Smart caching strategy: Load from IndexedDB first (fast), then refresh from API in background
      // This gives instant UI while ensuring fresh data
      // Sales, products, and expenses always fetch fresh from API (no stale cache)
      const isExpensesEndpoint = endpoint === 'expenses';
      const isIncomesEndpoint = endpoint === 'incomes';
      const isPayrollsEndpoint = endpoint === 'payrolls';
      const isBillsEndpoint = endpoint === 'bills';
      const isTaxesEndpoint = endpoint === 'taxes';
      const isBankDepositsEndpoint = endpoint === 'bankDeposits';
      const isLoansEndpoint = endpoint === 'loans';
      const isInvoicesEndpoint = endpoint === 'invoices';
      const isDocumentsEndpoint = endpoint === 'documents';
      const isProductsEndpoint = endpoint === 'products';
      const isClientsEndpoint = endpoint === 'clients';
      const isVendorsEndpoint = endpoint === 'vendors';
      const isAccountsEndpoint = endpoint === 'accounts';
      const isCategoryBudgetsEndpoint = endpoint === 'categoryBudgets';
      const isSchedulesEndpoint = endpoint === 'schedules';
      const isBookingsEndpoint = endpoint === 'bookings';
      const isCatalogEndpoint =
        isProductsEndpoint ||
        isClientsEndpoint ||
        isVendorsEndpoint ||
        isAccountsEndpoint ||
        isCategoryBudgetsEndpoint ||
        isSchedulesEndpoint ||
        isBookingsEndpoint;
      const isMoneyEndpoint = isExpensesEndpoint || isIncomesEndpoint || isPayrollsEndpoint || isBillsEndpoint || isTaxesEndpoint || isBankDepositsEndpoint || isLoansEndpoint || isInvoicesEndpoint || isDocumentsEndpoint;
      const shouldUseOfflineFirst = endpoint === 'products' || endpoint === 'sales' || isMoneyEndpoint;
      const shouldAlwaysFetchFresh = isSalesEndpoint || isProductsEndpoint || isMoneyEndpoint || isCatalogEndpoint;
      
      // For all endpoints, try to load from IndexedDB first for instant UI
      if (!isSalesEndpoint && !shouldUseOfflineFirst && !isCatalogEndpoint) {
        // Load from IndexedDB first (offline-first) for non-sales, non-products endpoints
        // Filter by userId if products have userId field (for data isolation)
        const localItems = await getAllItems<T>(storeName);
        
        const filteredItems = applyWorkspaceScope(
          localItems.filter((item: any) => {
            if (item.userId !== undefined && item.userId !== userId) {
              return false;
            }
            return itemBelongsToCurrentScope(item);
          }),
        );
        
        if (filteredItems.length > 0) {
          const mappedItems = reconcileListWithPendingDeletions(filteredItems.map(mapItem));
          setItems(mappedItems);
          setIsLoading(false);
        }
      
        // Check cache first to reduce API requests (for non-sales, non-products)
      const cacheKey = getScopedCacheKey(endpoint);
      const cached = apiCache.get(cacheKey);
      
      // If we have valid cached data and no local changes, use cache
      const lastSyncTime = localStorage.getItem("profit-pilot-last-sync");
      const hasLocalChanges = localStorage.getItem(`profit-pilot-${endpoint}-changed`) === "true";
      
      if (cached && !hasLocalChanges && lastSyncTime) {
        const cacheAge = Date.now() - parseInt(lastSyncTime);
        // If cache is fresh (less than 5 minutes old), use it (increased to reduce API calls)
        if (cacheAge < 5 * 60 * 1000) {
          const cachedItems = cached.data;
          const mappedItems = reconcileListWithPendingDeletions(
            Array.isArray(cachedItems) ? cachedItems.map(mapItem) : [],
          );
          setItems(mappedItems.length > 0 ? mappedItems : defaultValue);
          setIsLoading(false);
          isLoadingDataRef.current = false;
          return;
        }
        }
        } else {
          // Products/sales: show IndexedDB first for instant UI, then sync from API
          if (shouldUseOfflineFirst) {
            let hadLocalData = false;
            try {
              const localItems = await getAllItems<T>(storeName);

              const filteredItems = applyWorkspaceScope(
                localItems.filter((item: any) => {
                  if (item.userId !== undefined && item.userId !== userId) {
                    return false;
                  }
                  return itemBelongsToCurrentScope(item);
                }),
              );

              if (filteredItems.length > 0) {
                let mappedItems = filteredItems.map(mapItem);
                if (isSalesEndpoint) {
                  mappedItems = reconcileListWithPendingDeletions(mappedItems);
                  mappedItems.sort((a, b) => {
                    const aTime = (a as any).timestamp || (a as any).date;
                    const bTime = (b as any).timestamp || (b as any).date;
                    return new Date(bTime).getTime() - new Date(aTime).getTime();
                  });
                } else if (isExpensesEndpoint || isIncomesEndpoint || isPayrollsEndpoint || isBillsEndpoint || isTaxesEndpoint || isBankDepositsEndpoint || isLoansEndpoint || isInvoicesEndpoint) {
                  mappedItems.sort((a, b) => {
                    const aTime = (a as any).dueDate || (a as any).paymentDate || (a as any).date;
                    const bTime = (b as any).dueDate || (b as any).paymentDate || (b as any).date;
                    return new Date(bTime).getTime() - new Date(aTime).getTime();
                  });
                }

                setItems(mappedItems);
                setIsLoading(false);
                hadLocalData = true;
                console.log(
                  `[useApi] ${endpoint}: Loaded ${mappedItems.length} items from IndexedDB (showing immediately, refreshing from API...)`,
                );
              }
            } catch (error) {
              console.warn(`[useApi] ${endpoint}: Error loading from IndexedDB, will fetch from API:`, error);
            }

            // Non-critical endpoints can stop after scheduling a background refresh
            if (!shouldAlwaysFetchFresh && hadLocalData) {
              setTimeout(async () => {
                try {
                  const lastSyncTime = localStorage.getItem(`profit-pilot-${endpoint}-last-refresh`);
                  const now = Date.now();
                  const timeSinceLastRefresh = lastSyncTime ? now - parseInt(lastSyncTime) : Infinity;

                  if (timeSinceLastRefresh >= 30 * 1000) {
                    await fetchAndUpdateFromAPI();
                    localStorage.setItem(`profit-pilot-${endpoint}-last-refresh`, String(now));
                  }
                } catch (error) {
                  console.log(`[useApi] ${endpoint}: Background refresh failed, using IndexedDB data:`, error);
                }
              }, 100);

              isLoadingDataRef.current = false;
              return;
            }

            if (shouldAlwaysFetchFresh) {
              console.log(`[useApi] ${endpoint}: Fetching fresh data from API...`);
            } else if (!hadLocalData) {
              console.log(`[useApi] ${endpoint}: IndexedDB empty, fetching from API...`);
            }
          } else if (!isCatalogEndpoint) {
          const cacheKey = getScopedCacheKey(endpoint);
          const cached = apiCache.get(cacheKey);
          const lastSyncTime = localStorage.getItem("profit-pilot-last-sync");
          const hasLocalChanges = localStorage.getItem(`profit-pilot-${endpoint}-changed`) === "true";
          
          // Use cache if it's fresh (less than 2 minutes old) and no local changes
          if (cached && !hasLocalChanges && lastSyncTime) {
            const cacheAge = Date.now() - parseInt(lastSyncTime);
            if (cacheAge < 2 * 60 * 1000) { // 2 minutes cache
              const cachedItems = cached.data;
              const mappedItems = applyWorkspaceScope(
                Array.isArray(cachedItems) ? cachedItems.map(mapItem) : [],
              );
              if (mappedItems.length > 0) {
                // Sort by timestamp (newest first) for sales
                if (isSalesEndpoint) {
                  mappedItems.sort((a, b) => {
                    const aTime = (a as any).timestamp || (a as any).date;
                    const bTime = (b as any).timestamp || (b as any).date;
                    return new Date(bTime).getTime() - new Date(aTime).getTime();
                  });
                }
                setItems(mappedItems);
                setIsLoading(false);
                isLoadingDataRef.current = false;
                
                // Still fetch in background to update cache, but don't block UI
                if (isSalesEndpoint) {
                  saleApi.getAll().then((response) => {
                    if (response?.data) {
                      const freshItems = response.data.map(mapItem);
                      apiCache.set(cacheKey, response.data);
                      localStorage.setItem("profit-pilot-last-sync", String(Date.now()));
                      
                      // Update UI if data changed
                      freshItems.sort((a, b) => {
                        const aTime = (a as any).timestamp || (a as any).date;
                        const bTime = (b as any).timestamp || (b as any).date;
                        return new Date(bTime).getTime() - new Date(aTime).getTime();
                      });
                      setItems(freshItems);
                    }
                  }).catch(() => {
                    // Silently fail background refresh
                  });
                }
                return;
              }
            }
          }
        }
      }

      // Helper function to fetch from API and update IndexedDB
      const fetchAndUpdateFromAPI = async () => {
        let response;
        if (endpoint === 'products') {
          response = await productApi.getAll();
        } else if (endpoint === 'sales') {
          response = await saleApi.getAll();
        } else if (endpoint === 'clients') {
          response = await clientApi.getAll();
        } else if (endpoint === 'vendors') {
          response = await vendorApi.getAll();
        } else if (endpoint === 'accounts') {
          response = await accountApi.getAll();
        } else if (endpoint === 'categoryBudgets') {
          response = await categoryBudgetApi.getAll();
        } else if (endpoint === 'schedules') {
          response = await scheduleApi.getAll();
        } else if (endpoint === 'bookings') {
          response = await bookingApi.getAll();
        } else if (endpoint === 'expenses') {
          response = await expenseApi.getAll();
        } else if (endpoint === 'incomes') {
          response = await incomeApi.getAll();
        } else if (endpoint === 'payrolls') {
          response = await payrollApi.getAll();
        } else if (endpoint === 'bills') {
          response = await billApi.getAll();
        } else if (endpoint === 'taxes') {
          response = await taxApi.getAll();
        } else if (endpoint === 'bankDeposits') {
          response = await bankDepositApi.getAll();
        } else if (endpoint === 'loans') {
          response = await loanApi.getAll();
        } else if (endpoint === 'invoices') {
          response = await invoiceApi.getAll();
        } else if (endpoint === 'documents') {
          response = await documentApi.getAll();
        } else {
          throw new Error(`Unknown endpoint: ${endpoint}`);
        }
        
        // Verify userId and workspace scope haven't changed during the request
        const currentUserId = localStorage.getItem("profit-pilot-user-id");
        if (currentUserId !== userId) {
          throw new Error('User changed during request');
        }
        const requestScope = getWorkspaceScopeKey();
        if (requestScope !== currentScope) {
          throw new Error('Workspace scope changed during request');
        }
        
        return response;
      };

      try {
        const response = await fetchAndUpdateFromAPI();

        if (response.data) {
          const mappedItems = applyWorkspaceScope(response.data.map(mapItem));
          
          // For sales and products, update IndexedDB with fresh server data
          if (isSalesEndpoint || shouldUseOfflineFirst) {
            // Sales: drop rows we already deleted locally (stale GET may still include them)
            const reconciledItems = isSalesEndpoint
              ? reconcileListWithPendingDeletions(mappedItems)
              : reconcileListWithPendingDeletions(mappedItems);

            // Sort by timestamp (newest first) for sales; by date for finance records
            let sortedItems = reconciledItems;
            if (isSalesEndpoint) {
              sortedItems = [...reconciledItems].sort((a, b) => {
                const aTime = (a as any).timestamp || (a as any).date;
                const bTime = (b as any).timestamp || (b as any).date;
                return new Date(bTime).getTime() - new Date(aTime).getTime();
              });
            } else if (isExpensesEndpoint || isIncomesEndpoint || isPayrollsEndpoint || isBillsEndpoint || isTaxesEndpoint || isBankDepositsEndpoint || isLoansEndpoint || isInvoicesEndpoint) {
              sortedItems = [...reconciledItems].sort((a, b) => {
                const aTime = (a as any).dueDate || (a as any).paymentDate || (a as any).date;
                const bTime = (b as any).dueDate || (b as any).paymentDate || (b as any).date;
                return new Date(bTime).getTime() - new Date(aTime).getTime();
              });
            }

            // Update UI first — don't block on IndexedDB writes
            setItems((prevItems) => {
              if (isSalesEndpoint) {
                const serverIds = new Set(
                  sortedItems
                    .map((i: any) => String(i._id ?? i.id ?? ""))
                    .filter(Boolean),
                );
                const missingFromServer = prevItems.filter((i: any) => {
                  const id = String(i._id ?? i.id ?? "");
                  return id && isMongoServerId(id) && !serverIds.has(id);
                });
                const merged = deduplicateSales([...sortedItems, ...missingFromServer]);
                return merged.length > 0 ? merged : defaultValue;
              }

              if (isMoneyEndpoint) {
                const serverIds = new Set(
                  sortedItems
                    .map((i: any) => String(i._id ?? i.id ?? ""))
                    .filter(Boolean),
                );
                const missingFromServer = prevItems.filter((i: any) => {
                  const id = String(i._id ?? i.id ?? "");
                  return id && !serverIds.has(id);
                });
                const merged = [...sortedItems, ...missingFromServer].sort((a, b) => {
                  const aTime = (a as any).dueDate || (a as any).paymentDate || (a as any).date;
                  const bTime = (b as any).dueDate || (b as any).paymentDate || (b as any).date;
                  return new Date(bTime).getTime() - new Date(aTime).getTime();
                });
                return merged.length > 0 ? merged : defaultValue;
              }

              return sortedItems.length > 0 ? sortedItems : defaultValue;
            });

            const cacheKey = getScopedCacheKey(endpoint);
            apiCache.set(cacheKey, response.data);
            localStorage.setItem(`profit-pilot-${endpoint}-last-refresh`, String(Date.now()));
            localStorage.setItem("profit-pilot-last-sync", String(Date.now()));
            localStorage.removeItem(`profit-pilot-${endpoint}-changed`);

            console.log(`[useApi] ✓ ${endpoint} updated with ${sortedItems.length} fresh records from API`);

            // Persist to IndexedDB in the background so the dashboard isn't stuck loading
            void (async () => {
              try {
                await clearStore(storeName);
                const itemsWithUserId = reconciledItems.map((item) => ({
                  ...item,
                  userId,
                })) as T[];
                for (const item of itemsWithUserId) {
                  try {
                    await addItem(storeName, item);
                  } catch (addError) {
                    console.warn(`[useApi] Error adding ${endpoint} item to IndexedDB:`, addError);
                  }
                }
              } catch (clearError) {
                console.warn(`[useApi] Error syncing ${endpoint} to IndexedDB:`, clearError);
              }
            })();
          } else {
            // For other endpoints, use merge approach
            const cacheKey = getScopedCacheKey(endpoint);
            // Cache the response
            apiCache.set(cacheKey, response.data);
            // Clear the changed flag since we've synced
            localStorage.removeItem(`profit-pilot-${endpoint}-changed`);
            
            // Replace IndexedDB with fresh server data (no merge) for catalog entities
            if (isCatalogEndpoint) {
              // Clear existing products first
              try {
                await clearStore(storeName);
                console.log(`[useApi] Cleared products store to ensure fresh data`);
              } catch (clearError) {
                console.warn(`[useApi] Error clearing products store:`, clearError);
              }
              
              // Add all fresh server items with userId
              const itemsWithUserId = mappedItems.map(item => ({
                ...item,
                userId: userId
              })) as T[];
              
              for (const item of itemsWithUserId) {
                try {
                  await addItem(storeName, item);
                } catch (addError) {
                  console.warn(`[useApi] Error adding product to IndexedDB:`, addError);
                }
              }
              
              const freshItems = deduplicateByRecordId(
                reconcileListWithPendingDeletions(mappedItems.map(mapItem)),
              );
              setItems(freshItems.length > 0 ? freshItems : defaultValue);
            } else {
              // For other endpoints, use merge approach
              // Update IndexedDB with server data (merge with local data, prevent duplicates)
              // Add userId to each item for data isolation
              const itemsWithUserId = mappedItems.map(item => ({
                ...item,
                userId: userId
              })) as T[];
              
              const existingItems = await getAllItems<T>(storeName);
              // Normalize server IDs to strings for consistent comparison
              const serverIds = new Set(itemsWithUserId.map(i => {
                const id = (i as any)._id || (i as any).id;
                return id ? String(id) : null;
              }).filter(id => id !== null));
              
              // Remove local items that don't exist on server or belong to different user (cleanup)
              for (const localItem of existingItems) {
                const localId = (localItem as any)._id || (localItem as any).id;
                const localUserId = (localItem as any).userId;
                
                // Remove items from different users
                if (localUserId && localUserId !== userId) {
                  try {
                    const itemId = (localItem as any).id;
                    if (itemId) {
                      const numericId = typeof itemId === 'string' ? parseInt(itemId) : itemId;
                      if (!isNaN(numericId)) {
                        await deleteItem(storeName, numericId);
                      }
                    }
                  } catch (deleteError) {
                    // Ignore delete errors
                  }
                  continue;
                }
                
                // Normalize local ID to string for comparison
                const normalizedLocalId = localId ? String(localId) : null;
                if (normalizedLocalId && !serverIds.has(normalizedLocalId)) {
                  // Check if this is a temporary ID (very large number from generateUniqueId)
                  // Temporary IDs are typically > 1e15, server IDs are strings or smaller numbers
                  const isTemporaryId = typeof localId === 'number' && localId > 1e15;
                  if (isTemporaryId) {
                    // This is likely a temporary ID, check if it matches any server item by content
                    // (For now, we'll keep it if it doesn't match - it might be a pending sync)
                    continue;
                  }
                  
                  // Item doesn't exist on server and is not a temporary ID - delete it (product was deleted)
                  try {
                    // Use the numeric id that IndexedDB uses (not _id)
                    const itemId = (localItem as any).id;
                    if (itemId && typeof itemId === 'number') {
                      await deleteItem(storeName, itemId);
                      console.log(`[useApi] Removed deleted item from IndexedDB: ${itemId} (server ID: ${localId})`);
                    } else if (itemId) {
                      // Try to convert to number if it's a string
                      const numericId = typeof itemId === 'string' ? parseInt(itemId) : itemId;
                      if (!isNaN(numericId) && isFinite(numericId)) {
                        await deleteItem(storeName, numericId);
                        console.log(`[useApi] Removed deleted item from IndexedDB: ${numericId} (server ID: ${localId})`);
                      }
                    }
                  } catch (deleteError) {
                    // Log but don't fail - continue with other items
                    console.warn(`[useApi] Error removing deleted item from IndexedDB:`, deleteError);
                  }
                }
              }
              
              // Now add/update all server items with userId for data isolation
              for (const item of mappedItems) {
                const itemId = (item as any)._id || (item as any).id;
                if (itemId) {
                  // Add userId to item for data isolation
                  const itemWithUserId = {
                    ...item,
                    userId: userId
                  } as T;
                  
                  // Check if item already exists
                  const existingItem = existingItems.find((i: any) => {
                    const existingId = (i as any)._id || (i as any).id;
                    return existingId === itemId;
                  });
                  
                  if (existingItem) {
                    await updateItem(storeName, itemWithUserId);
                  } else {
                    await addItem(storeName, itemWithUserId);
                  }
                }
              }
              
              // Reload from IndexedDB to get the merged result, filtered by userId
              const allItems = await getAllItems<T>(storeName);
              const finalItems = allItems.filter((item: any) => {
                if (item.userId !== undefined && item.userId !== userId) {
                  return false;
                }
                return itemBelongsToCurrentScope(item);
              });
              const finalMappedItems = reconcileListWithPendingDeletions(finalItems.map(mapItem));
              
              setItems(finalMappedItems.length > 0 ? finalMappedItems : defaultValue);
            }
          }
          
          // Update last sync timestamp in localStorage
          localStorage.setItem("profit-pilot-last-sync", String(Date.now()));
        }
      } catch (apiError: any) {
        const isConnectionFailure =
          apiError?.response?.connectionError || apiError?.response?.silent;

        // Sales/products/expenses always fetch fresh from API first — fall back to IndexedDB when offline
        if (isSalesEndpoint || isProductsEndpoint || isMoneyEndpoint) {
          if (isConnectionFailure) {
            const localItems = await getAllItems<T>(storeName);
            if (localItems.length > 0) {
              let mappedItems = applyWorkspaceScope(localItems.map(mapItem));
              if (isSalesEndpoint) {
                mappedItems = reconcileListWithPendingDeletions(mappedItems);
                mappedItems.sort((a, b) => {
                  const aTime = (a as any).timestamp || (a as any).date;
                  const bTime = (b as any).timestamp || (b as any).date;
                  return new Date(bTime).getTime() - new Date(aTime).getTime();
                });
              } else if (isExpensesEndpoint || isIncomesEndpoint) {
                mappedItems.sort((a, b) => {
                  const aTime = (a as any).date;
                  const bTime = (b as any).date;
                  return new Date(bTime).getTime() - new Date(aTime).getTime();
                });
              }
              setItems(mappedItems);
            } else {
              setItems(defaultValue);
            }
          } else if (apiError?.status === 401 || apiError?.status === 403) {
            setItems(defaultValue);
          } else {
            setItems(defaultValue);
          }
        } else {
          if (isConnectionFailure) {
            try {
              const localItems = await getAllItems<T>(storeName);
              const filteredItems = localItems.filter((item: any) => {
                if (item.userId !== undefined && item.userId !== userId) {
                  return false;
                }
                return itemBelongsToCurrentScope(item);
              });
              if (filteredItems.length > 0) {
                setItems(applyWorkspaceScope(filteredItems.map(mapItem)));
              }
            } catch {
              // keep existing items
            }
          }
        }
      }
      
      // Calculate remaining time to meet minimum loading duration
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
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
      
      // Only call onError if it's not a silent connection error
      if (onError && !hasErrorShownRef.current && !(error as any).silent) {
        onError(error);
        hasErrorShownRef.current = true;
      }
      
      // Fallback to default value on error — keep any data already shown from IndexedDB
      setItems((prev) => (prev.length > 0 ? prev : defaultValue));
      setIsLoading(false);
    } finally {
      isLoadingDataRef.current = false;
      const pending = pendingLoadRef.current;
      if (pending) {
        pendingLoadRef.current = null;
        void loadData(pending);
      }
    }
  }, [endpoint, defaultValue, mapItem, onError, syncManager, reconcileListWithPendingDeletions, mode, activeWorkspace, canAccessPage]);

  // Track last load time to prevent excessive reloads
  const lastLoadTimeRef = useRef<number>(0);
  const itemsLengthRef = useRef<number>(0);
  const hasLoadedOnMountRef = useRef<boolean>(false);
  const MIN_RELOAD_INTERVAL = 5000; // 5 seconds minimum between reloads (increased to prevent loops)
  const MIN_RELOAD_INTERVAL_FOR_PRODUCTS_SALES = 10000; // 10 seconds for products/sales to prevent loops
  
  // Products, sales, and expenses should always refresh on mount/page open
  const shouldAlwaysRefresh = endpoint === 'products' || endpoint === 'sales' || endpoint === 'clients' || endpoint === 'vendors' || endpoint === 'accounts' || endpoint === 'categoryBudgets' || endpoint === 'schedules' || endpoint === 'bookings' || endpoint === 'expenses' || endpoint === 'incomes' || endpoint === 'payrolls' || endpoint === 'bills' || endpoint === 'taxes' || endpoint === 'bankDeposits' || endpoint === 'loans' || endpoint === 'invoices' || endpoint === 'documents';
  const minReloadInterval = shouldAlwaysRefresh ? MIN_RELOAD_INTERVAL_FOR_PRODUCTS_SALES : MIN_RELOAD_INTERVAL;

  // Update items length ref when items change
  useEffect(() => {
    itemsLengthRef.current = items.length;
    itemsRef.current = items;
  }, [items]);

  // Sync this hook's state when another component mutates the same endpoint
  useEffect(() => {
    const handleDataChanged = (event: Event) => {
      const detail = (event as CustomEvent<DataChangedDetail>).detail;
      if (!detail) {
        setItems(defaultValue);
        void clearStore(endpoint).catch(() => undefined);
        void loadData({ force: true });
        return;
      }
      if (detail.endpoint !== endpoint) return;

      if (detail.action === 'create' && detail.item) {
        const mapped = mapItem(detail.item);
        setItems((prev) => applyCreateToList(prev, mapped, endpoint));
      } else if (detail.action === 'update' && detail.item) {
        const mapped = mapItem(detail.item);
        setItems((prev) => applyUpdateToList(prev, mapped));
      } else if (detail.action === 'delete' && detail.itemId) {
        const pending = new Set([String(detail.itemId)]);
        setItems((prev) =>
          prev.filter((i) => !recordMatchesDeleteIds(i as { _id?: string; id?: number | string }, pending)),
        );
      }
    };

    window.addEventListener(DATA_CHANGED_EVENT, handleDataChanged);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, handleDataChanged);
  }, [endpoint, mapItem, loadData, defaultValue]);

  useEffect(() => {
    const handleWorkspaceChange = () => {
      setItems(defaultValue);
      void clearStore(endpoint).catch(() => undefined);
      localStorage.removeItem(`profit-pilot-${endpoint}-last-refresh`);
      void loadData({ force: true });
    };

    window.addEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChange);
    return () => window.removeEventListener(WORKSPACE_CHANGED_EVENT, handleWorkspaceChange);
  }, [endpoint, loadData, defaultValue]);

  // Patch product stock in memory when sales change inventory (instant UI)
  useEffect(() => {
    if (endpoint !== "products") return;

    const handleStockPatch = (event: Event) => {
      const detail = (event as CustomEvent<{
        productId?: string;
        newStock?: number;
        delta?: number;
      }>).detail;
      const productId = detail?.productId?.toString();
      if (!productId) return;

      setItems((prev) => {
        let changed = false;
        const next = prev.map((item) => {
          const id = ((item as { _id?: string; id?: string | number })._id ?? (item as { id?: string | number }).id)?.toString();
          if (id !== productId) return item;
          const current = Number((item as { stock?: number }).stock) || 0;
          const stock =
            detail.newStock !== undefined
              ? detail.newStock
              : Math.max(0, current + (detail.delta ?? 0));
          if (stock === current) return item;
          changed = true;
          return { ...item, stock } as T;
        });
        return changed ? next : prev;
      });
    };

    window.addEventListener("product-stock-updated", handleStockPatch);
    return () => window.removeEventListener("product-stock-updated", handleStockPatch);
  }, [endpoint]);

  // Load data on mount and when force refresh is requested
  useEffect(() => {
    // Only load once on mount - prevent duplicate loads
    if (hasLoadedOnMountRef.current) {
      return;
    }
    
    // Always reload on mount (especially for products and sales)
    console.log(`[useApi] Loading ${endpoint} on mount${shouldAlwaysRefresh ? ' (always refresh)' : ''}`);
    loadData();
    lastLoadTimeRef.current = Date.now();
    itemsLengthRef.current = items.length;
    hasLoadedOnMountRef.current = true;
    
    // Listen for force refresh events (when caches are cleared)
    const handleForceRefresh = () => {
      const now = Date.now();
      const timeSinceLastLoad = now - lastLoadTimeRef.current;
      
      // Only refresh if enough time has passed
      if (timeSinceLastLoad >= minReloadInterval && !isLoadingDataRef.current) {
        console.log(`[useApi] Force refresh requested for ${endpoint}`);
        loadData();
        lastLoadTimeRef.current = now;
      }
    };
    
    // Reload data when page becomes visible (user returns to tab/window)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const now = Date.now();
        const timeSinceLastLoad = now - lastLoadTimeRef.current;
        const currentItemsLength = itemsLengthRef.current;
        
        // Only reload if enough time has passed and not already loading
        // For products/sales, use longer interval to prevent loops
        const shouldReload = !isLoadingDataRef.current && 
          timeSinceLastLoad >= minReloadInterval &&
          (currentItemsLength === 0 || shouldAlwaysRefresh);
        
        if (shouldReload) {
          console.log(`[useApi] Page became visible, reloading ${endpoint}${currentItemsLength === 0 ? ' (items empty)' : shouldAlwaysRefresh ? ' (always refresh)' : ''}`);
          lastLoadTimeRef.current = now;
          loadData();
        }
      }
    };
    
    // Reload data when window regains focus (user switches back to app)
    const handleFocus = () => {
      const now = Date.now();
      const timeSinceLastLoad = now - lastLoadTimeRef.current;
      const currentItemsLength = itemsLengthRef.current;
      
      // Only reload if enough time has passed and not already loading
      // For products/sales, use longer interval to prevent loops
      const shouldReload = !isLoadingDataRef.current && 
        timeSinceLastLoad >= minReloadInterval &&
        (currentItemsLength === 0 || shouldAlwaysRefresh);
      
      if (shouldReload) {
        console.log(`[useApi] Window regained focus, reloading ${endpoint}${currentItemsLength === 0 ? ' (items empty)' : shouldAlwaysRefresh ? ' (always refresh)' : ''}`);
        lastLoadTimeRef.current = now;
        loadData();
      }
    };
    
    // Listen for page-open events (custom event dispatched when navigating to a page)
    const handlePageOpen = () => {
      const now = Date.now();
      const timeSinceLastLoad = now - lastLoadTimeRef.current;
      
      // Only reload if enough time has passed and not already loading
      // This prevents infinite loops from rapid page navigation
      if (shouldAlwaysRefresh && !isLoadingDataRef.current && timeSinceLastLoad >= minReloadInterval) {
        console.log(`[useApi] Page opened, reloading ${endpoint}`);
        lastLoadTimeRef.current = now;
        loadData();
      }
    };
    
    window.addEventListener('force-refresh-data', handleForceRefresh);
    window.addEventListener('page-opened', handlePageOpen);

    const handleOnline = () => {
      if (itemsLengthRef.current > 0) return;
      const now = Date.now();
      if (!isLoadingDataRef.current && now - lastLoadTimeRef.current >= 2000) {
        console.log(`[useApi] Back online with empty ${endpoint}, reloading...`);
        lastLoadTimeRef.current = now;
        loadData();
      }
    };
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('force-refresh-data', handleForceRefresh);
      window.removeEventListener('page-opened', handlePageOpen);
      window.removeEventListener('online', handleOnline);
    };
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
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [items, defaultValue]);

  // Add item - save to IndexedDB first, then sync with backend
  const add = useCallback(async (item: T): Promise<T> => {
    // Validate userId exists (data isolation)
    const userId = localStorage.getItem("profit-pilot-user-id");
    if (!userId) {
      throw new Error('User not authenticated. Please login.');
    }
    
    // Always save to IndexedDB first, even if offline - this ensures data is never lost
    // We'll try to sync to server, and if it fails, the item will remain in IndexedDB for later sync
    
    try {
      await tryInitDB();
      const storeName = endpoint;
      
      // For all endpoints (including sales), save to IndexedDB first for immediate UI update
      // Then sync to server - this ensures items appear even if API call fails
      const isSalesEndpoint = endpoint === 'sales';
      let localId: any = null;
      let itemWithId: any = null;
      
      // Generate local ID if not present
      itemWithId = { ...item };
      if (!itemWithId.id && !itemWithId._id) {
        (itemWithId as any).id = generateUniqueId();
      }
      
      // Add userId for data isolation
      (itemWithId as any).userId = userId;
      
      // Ensure timestamp is present for sales (preserve if exists, add if missing)
      if (endpoint === 'sales' && !itemWithId.timestamp) {
        (itemWithId as any).timestamp = new Date().toISOString();
      }
      
      localId = (itemWithId as any).id || (itemWithId as any)._id;
      
      // For sales, wait for backend confirmation before showing in UI
      // Don't update UI until backend confirms the sale
      if (isSalesEndpoint) {
        // Save to IndexedDB for offline support, but don't show in UI yet
        await addItem(storeName, itemWithId);
        
        // Dispatch event to notify that sale recording has started
        // This allows Dashboard and Sales pages to show loading state
        window.dispatchEvent(new CustomEvent('sale-recording-started', { 
          detail: { sale: item } 
        }));

        const saleProductId = (item as any).productId?.toString();
        const saleQty = Number((item as any).quantity) || 0;
        const isProductSale = Boolean(saleProductId && saleQty > 0);
        if (isProductSale) {
          applyProductStockDelta(saleProductId, -saleQty);
        }
        
        // Make API call and wait for response before updating UI
        // This ensures we only show sales that are confirmed by backend
        // Prepare item data for API call
        const itemData = { ...item };
        delete (itemData as any).id;
        delete (itemData as any)._id;
        
        // Ensure timestamp is present for sales
        if (!(itemData as any).timestamp) {
          (itemData as any).timestamp = new Date().toISOString();
        }
        
        // Wait for API call to complete before updating UI
        // Only show sales that are confirmed by backend
        try {
          const response = await saleApi.create(itemData);
          
          if (!response || (!response.data && !response)) {
            console.warn('[useApi] Invalid response from sales API');
            throw new Error('Invalid response from sales API');
          }
          
          // Handle response - backend may return data in response.data or directly
          const responseData = response?.data || response;
          if (!responseData) {
            console.warn('[useApi] No data in sales API response');
            throw new Error('No data in sales API response');
          }
          
          const syncedItem = mapItem(responseData);
          
          // Ensure timestamp is preserved
          if (!(syncedItem as any).timestamp && (item as any).timestamp) {
            (syncedItem as any).timestamp = (item as any).timestamp;
          } else if (!(syncedItem as any).timestamp) {
            (syncedItem as any).timestamp = new Date().toISOString();
          }
          
          // Replace the local pending row with the server-confirmed sale (same IndexedDB key)
          const syncedItemWithUserId = {
            ...syncedItem,
            userId: userId,
          } as T;
          const syncedForStore = {
            ...syncedItemWithUserId,
            id: localId,
          } as T;
          await updateItem(storeName, syncedForStore);
          
          // Invalidate cache
          apiCache.invalidateStore(endpoint);
          localStorage.setItem(`profit-pilot-${endpoint}-changed`, "true");
          
          // NOW update UI - only after backend confirms the sale
          setItems((prev) => deduplicateSales([syncedItem as T, ...prev]));
          
          // Dispatch event to notify other components (after backend confirms)
          window.dispatchEvent(new CustomEvent('sale-recorded', { detail: { sale: syncedItem } }));
          window.dispatchEvent(new CustomEvent('sales-should-refresh'));
          dispatchDataChanged({ endpoint: 'sales', action: 'create', item: syncedItem });
          
          // Dispatch event to notify that sale recording has completed successfully
          window.dispatchEvent(new CustomEvent('sale-recording-completed', { 
            detail: { sale: syncedItem, success: true } 
          }));

          if (isProductSale) {
            mirrorProductStockInIndexedDB(saleProductId, -saleQty);
          }
          return syncedItem as T;
        } catch (error: any) {
          const isNetworkError = isLikelyNetworkError(error);

          if (isNetworkError) {
            const offlineSale = mapItem(itemWithId);
            setItems((prev) => applyCreateToList(prev, offlineSale as T, 'sales'));
            dispatchDataChanged({ endpoint: 'sales', action: 'create', item: offlineSale });
            window.dispatchEvent(new CustomEvent('sale-recorded', { detail: { sale: offlineSale } }));
            window.dispatchEvent(new CustomEvent('sale-recording-completed', {
              detail: { sale: offlineSale, success: true },
            }));
            const offlineProductId = (item as any).productId?.toString();
            const offlineQty = Number((item as any).quantity) || 0;
            if (offlineProductId && offlineQty > 0 && !isProductSale) {
              applyProductStockDelta(offlineProductId, -offlineQty);
            }
            await syncManager.queueAction({
              type: "create",
              store: storeName,
              data: itemWithId,
            });
            const silentError: any = new Error("Sale saved locally. Will sync when online.");
            silentError.response = { silent: true, connectionError: true };
            throw silentError;
          }

          // If API call fails for a real error, remove from IndexedDB and throw
          if (isProductSale) {
            applyProductStockDelta(saleProductId, saleQty);
          }
          try {
            const numericId = typeof localId === 'string' ? parseInt(localId) : localId;
            if (!isNaN(numericId)) {
              await deleteItem(storeName, numericId);
            }
          } catch (deleteError) {
            console.warn('[useApi] Error removing failed sale from IndexedDB:', deleteError);
          }
          console.error(`[useApi] Error saving sale to backend:`, error);
          
          // Dispatch event to notify that sale recording has completed with failure
          window.dispatchEvent(new CustomEvent('sale-recording-completed', { 
            detail: { sale: item, success: false, error } 
          }));
          
          throw error; // Re-throw so caller knows it failed
        }
        
        // Return after API call completes
        return itemWithId as T;
      }
      
      // Optimistic local save — instant UI, then sync to server
      await addItem(storeName, itemWithId);
      const optimisticItem = mapItem(itemWithId) as T;
      setItems((prev) => applyCreateToList(prev, optimisticItem, endpoint));
      dispatchDataChanged({ endpoint, action: 'create', item: optimisticItem });
      
      // For other endpoints, continue with blocking API call
      // ALWAYS try to send to backend when online - this is the primary path
      const itemData = { ...item };
      delete (itemData as any).id;
      delete (itemData as any)._id;
      
      // Ensure timestamp is present for sales (preserve if exists, add if missing)
      if ((endpoint as string) === 'sales' && !(itemData as any).timestamp) {
        (itemData as any).timestamp = new Date().toISOString();
      }
      
      // logger.log(`[useApi] Sending ${endpoint} to backend (online: ${navigator.onLine}):`, itemData);
      
      try {
        let response;
        if (endpoint === 'products') {
          response = await productApi.create(itemData);
        } else if (endpoint === 'clients') {
          response = await clientApi.create(itemData);
        } else if (endpoint === 'vendors') {
          response = await vendorApi.create(itemData);
        } else if (endpoint === 'accounts') {
          response = await accountApi.create(itemData);
        } else if (endpoint === 'categoryBudgets') {
          response = await categoryBudgetApi.create(itemData);
        } else if (endpoint === 'schedules') {
          response = await scheduleApi.create(itemData);
        } else if (endpoint === 'bookings') {
          response = await bookingApi.create(itemData);
        } else if (endpoint === 'expenses') {
          response = await expenseApi.create(itemData);
        } else if (endpoint === 'incomes') {
          response = await incomeApi.create(itemData);
        } else if (endpoint === 'payrolls') {
          response = await payrollApi.create(itemData);
        } else if (endpoint === 'bills') {
          response = await billApi.create(itemData);
        } else if (endpoint === 'taxes') {
          response = await taxApi.create(itemData);
        } else if (endpoint === 'bankDeposits') {
          response = await bankDepositApi.create(itemData);
        } else if (endpoint === 'loans') {
          response = await loanApi.create(itemData);
        } else if (endpoint === 'invoices') {
          response = await invoiceApi.create(itemData);
        } else if (endpoint === 'documents') {
          response = await documentApi.create(itemData);
        } else {
          throw new Error(`Unknown endpoint: ${endpoint}`);
        }

        // logger.log(`[useApi] Backend response received for ${endpoint}:`, response);
        // logger.log(`[useApi] Response structure:`, {
        //   hasData: !!response?.data,
        //   hasResponse: !!response,
        //   responseKeys: response ? Object.keys(response) : [],
        // });
        
        // Handle response - backend may return data in response.data or directly
        const responseData = response?.data || response;
        // logger.log(`[useApi] Extracted response data for ${endpoint}:`, responseData);
        
        if (!responseData) {
          // logger.error(`[useApi] ✗ No data in response for ${endpoint}:`, response);
          throw new Error(`Invalid API response: No data received from server for ${endpoint}`);
        }
        
        // logger.log(`[useApi] Processing response data for ${endpoint}:`, responseData);
        const syncedItem = mapItem(responseData);
        
        // Ensure timestamp is preserved for sales (use server timestamp if available, otherwise use original)
        if ((endpoint as string) === 'sales') {
          if (!(syncedItem as any).timestamp && (item as any).timestamp) {
            (syncedItem as any).timestamp = (item as any).timestamp;
          } else if (!(syncedItem as any).timestamp) {
            (syncedItem as any).timestamp = new Date().toISOString();
          }
        }
        
        // logger.log(`[useApi] Mapped synced item for ${endpoint}:`, syncedItem);
        
        // CRITICAL: If we got here, the backend call succeeded!
        // logger.log(`[useApi] ✓ Successfully sent ${endpoint} to backend via DIRECT API call!`);
        
        // For all endpoints, find and remove the local item with the temporary ID
          const existingItems = await getAllItems<T>(storeName);
          const localItemToRemove = existingItems.find((i) => {
            const currentId = (i as any)._id || (i as any).id;
            return currentId === localId;
          });
          
          // Remove the local item if it exists
          if (localItemToRemove) {
            const numericId = typeof localId === 'string' ? parseInt(localId) : localId;
            if (!isNaN(numericId)) {
              await deleteItem(storeName, numericId);
            }
          }
          
          // Add userId for data isolation
          const syncedItemWithUserId = {
            ...syncedItem,
            userId: userId
          } as T;
          
          // Add the synced item with server ID
          await addItem(storeName, syncedItemWithUserId);
          
          // Invalidate cache for this endpoint since data changed
          apiCache.invalidateStore(endpoint);
          localStorage.setItem(`profit-pilot-${endpoint}-changed`, "true");
          
          // Update UI - replace optimistic/temp row with server-confirmed item
          setItems((prev) => {
          if (isSalesEndpoint) {
            // For sales, replace local item with server item or add if not found, then deduplicate
            const itemExists = prev.some((i) => {
              const currentId = (i as any)._id || (i as any).id;
              return currentId === localId;
            });
            
            let updated: T[];
            if (itemExists) {
              // Replace existing item
              updated = prev.map((i) => {
                const currentId = (i as any)._id || (i as any).id;
                return currentId === localId ? syncedItem : i;
              });
            } else {
              // Add new item if it doesn't exist (ensures immediate update)
              updated = [...prev, syncedItem];
            }
            
            // Deduplicate sales by content
              const seen = new Map<string, T>();
              for (const item of updated) {
                const sale = item as any;
                const dateStr = typeof sale.date === 'string' 
                  ? sale.date.split('T')[0] 
                  : new Date(sale.date).toISOString().split('T')[0];
                const key = `${sale.product}_${dateStr}_${sale.quantity}_${sale.revenue}`;
                
                if (seen.has(key)) {
                  const existing = seen.get(key)!;
                  const existingId = (existing as any)._id || (existing as any).id;
                  const currentId = (sale as any)._id || (sale as any).id;
                  
                  // Prefer server ID over temporary ID
                  const existingIsServerId = typeof existingId === 'string' || (typeof existingId === 'number' && existingId < 1e15);
                  const currentIsServerId = typeof currentId === 'string' || (typeof currentId === 'number' && currentId < 1e15);
                  
                  if (currentIsServerId && !existingIsServerId) {
                    seen.set(key, item);
                  }
                } else {
                  seen.set(key, item);
                }
              }
              const deduplicated = Array.from(seen.values());
              
              // Sort by timestamp (newest first) to ensure new sales appear at top
              deduplicated.sort((a, b) => {
                const aTime = (a as any).timestamp || (a as any).date;
                const bTime = (b as any).timestamp || (b as any).date;
                return new Date(bTime).getTime() - new Date(aTime).getTime();
              });
              
              return deduplicated;
          } else {
            const localKey = String(localId);
            const withoutTemp = prev.filter((i) => {
              const currentId = getRecordId(i as { _id?: string; id?: number });
              return currentId !== localKey;
            });
            return applyCreateToList(withoutTemp, syncedItem as T, endpoint);
          }
        });
        dispatchDataChanged({ endpoint, action: 'create', item: syncedItem });
        return syncedItem as T;
      } catch (apiError: any) {
        const isNetworkError = isLikelyNetworkError(apiError);
        
        const localKey = String(localId);

        // For products, don't queue for sync - roll back optimistic row and throw
        if (endpoint === 'products') {
          setItems((prev) =>
            prev.filter((i) => getRecordId(i as { _id?: string; id?: number }) !== localKey),
          );
          dispatchDataChanged({ endpoint, action: 'delete', itemId: localKey });
          try {
            const numericId = typeof localId === 'string' ? parseInt(localId) : localId;
            if (!isNaN(numericId)) {
              await deleteItem(storeName, numericId);
            }
          } catch {}
          throw apiError;
        }
        
        // For other endpoints, queue for sync if it's a REAL network/connection error
        if (isNetworkError) {
          // logger.log(`[useApi] Network error detected for ${endpoint}, queueing for sync:`, apiError);
          await syncManager.queueAction({
            type: "create",
            store: storeName,
            data: itemWithId,
          });
          // Throw a silent error so the UI can show success message
          const silentError: any = new Error("Item saved locally. Will sync when online.");
          silentError.response = { silent: true, connectionError: true };
          throw silentError;
        } else {
          setItems((prev) =>
            prev.filter((i) => getRecordId(i as { _id?: string; id?: number }) !== localKey),
          );
          dispatchDataChanged({ endpoint, action: 'delete', itemId: localKey });
          try {
            const numericId = typeof localId === 'string' ? parseInt(localId) : localId;
            if (!isNaN(numericId)) {
              await deleteItem(storeName, numericId);
            }
          } catch {}
          throw apiError;
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add item');
      // Check if it's a silent connection error
      if ((error as any).response?.silent || (error as any).response?.connectionError) {
        // Re-throw as-is for UI handling
        throw error;
      }
      setError(error);
      // Don't show errors for connection issues
      if (onError && !(error as any).silent) {
        onError(error);
      }
      throw error;
    }
  }, [endpoint, mapItem, onError, syncManager]);

  // Update item - save to IndexedDB first, then sync with backend
  const update = useCallback(async (item: T): Promise<T> => {
    // Validate userId exists (data isolation)
    const userId = localStorage.getItem("profit-pilot-user-id");
    if (!userId) {
      throw new Error('User not authenticated. Please login.');
    }
    
    try {
      await tryInitDB();
      const storeName = endpoint;
      const itemId = (item as any)._id || (item as any).id;
      if (!itemId) {
        throw new Error('Item ID is required for update');
      }

      // Add userId for data isolation
      const itemWithUserId = {
        ...item,
        userId: userId
      } as T;

      const previousItem =
        itemsRef.current.find((existing) => String((existing as any)._id || (existing as any).id) === String(itemId)) ||
        null;

      // Save to IndexedDB first (offline-first)
      await updateItem(storeName, itemWithUserId);
      
      // Update UI immediately
      const updatedItem = mapItem(item);
      setItems((prev) =>
        prev.map((i) => {
          const currentId = (i as any)._id || (i as any).id;
          return currentId === itemId ? updatedItem : i;
        })
      );
      dispatchDataChanged({ endpoint, action: 'update', item: updatedItem });

      // Try to sync with backend (silently fail if offline)
      const itemData = { ...item };
      delete (itemData as any).id;
      delete (itemData as any)._id;
      delete (itemData as any).__v; // Remove MongoDB version field to avoid version conflicts
      
      try {
        let response;
        if (endpoint === 'products') {
          response = await productApi.update(itemId.toString(), itemData);
        } else if (endpoint === 'sales') {
          response = await saleApi.update(itemId.toString(), itemData);
        } else if (endpoint === 'clients') {
          response = await clientApi.update(itemId.toString(), itemData);
        } else if (endpoint === 'vendors') {
          response = await vendorApi.update(itemId.toString(), itemData);
        } else if (endpoint === 'accounts') {
          response = await accountApi.update(itemId.toString(), itemData);
        } else if (endpoint === 'categoryBudgets') {
          response = await categoryBudgetApi.update(itemId.toString(), itemData);
        } else if (endpoint === 'schedules') {
          response = await scheduleApi.update(itemId.toString(), itemData);
        } else if (endpoint === 'bookings') {
          response = await bookingApi.update(itemId.toString(), itemData);
        } else if (endpoint === 'expenses') {
          response = await expenseApi.update(itemId.toString(), itemData);
        } else if (endpoint === 'incomes') {
          response = await incomeApi.update(itemId.toString(), itemData);
        } else if (endpoint === 'payrolls') {
          response = await payrollApi.update(itemId.toString(), itemData);
        } else if (endpoint === 'bills') {
          response = await billApi.update(itemId.toString(), itemData);
        } else if (endpoint === 'taxes') {
          response = await taxApi.update(itemId.toString(), itemData);
        } else if (endpoint === 'bankDeposits') {
          response = await bankDepositApi.update(itemId.toString(), itemData);
        } else if (endpoint === 'loans') {
          response = await loanApi.update(itemId.toString(), itemData);
        } else if (endpoint === 'invoices') {
          response = await invoiceApi.update(itemId.toString(), itemData);
        } else if (endpoint === 'documents') {
          response = await documentApi.update(itemId.toString(), itemData);
        } else {
          throw new Error(`Unknown endpoint: ${endpoint}`);
        }

        if (response.data) {
          const syncedItem = mapItem(response.data);
          // Add userId for data isolation
          const syncedItemWithUserId = {
            ...syncedItem,
            userId: userId
          } as T;
          // Update IndexedDB with server response
          await updateItem(storeName, syncedItemWithUserId);
          
          // Invalidate cache for this endpoint since data changed
          apiCache.invalidateStore(endpoint);
          localStorage.setItem(`profit-pilot-${endpoint}-changed`, "true");
          
          // Update UI with synced item
          setItems((prev) =>
            prev.map((i) => {
              const currentId = (i as any)._id || (i as any).id;
              return currentId === itemId ? syncedItem : i;
            })
          );
          dispatchDataChanged({ endpoint, action: 'update', item: syncedItem });
          
          // Automatically dispatch event for product stock updates
          if (endpoint === 'products') {
            window.dispatchEvent(new CustomEvent('product-stock-updated', { 
              detail: { productId: itemId, newStock: (syncedItem as any).stock } 
            }));
          }
          return syncedItem as T;
        }
      } catch (apiError: any) {
        // For sales and products, don't queue for sync - restore previous server state
        if (endpoint === 'sales' || endpoint === 'products') {
          if (previousItem) {
            await updateItem(storeName, {
              ...previousItem,
              userId,
            } as T);
            setItems((prev) =>
              prev.map((i) => {
                const currentId = (i as any)._id || (i as any).id;
                return currentId === itemId ? previousItem : i;
              }),
            );
            dispatchDataChanged({ endpoint, action: 'update', item: previousItem });
          }
          throw apiError;
        }
        
        const isNetworkError = isLikelyNetworkError(apiError);
        
        // Only queue for sync if it's a REAL network/connection error (for non-sales, non-products endpoints)
        if (isNetworkError) {
          // logger.log(`[useApi] Network error detected for ${endpoint} update, queueing for sync:`, apiError);
          await syncManager.queueAction({
            type: "update",
            store: storeName,
            data: item,
          });
          // Throw a silent error so the UI can show success message
          const silentError: any = new Error("Item updated locally. Will sync when online.");
          silentError.response = { silent: true, connectionError: true };
          throw silentError;
        } else {
          if (previousItem) {
            await updateItem(storeName, {
              ...previousItem,
              userId,
            } as T);
            setItems((prev) =>
              prev.map((i) => {
                const currentId = (i as any)._id || (i as any).id;
                return currentId === itemId ? previousItem : i;
              }),
            );
            dispatchDataChanged({ endpoint, action: 'update', item: previousItem });
          }
          throw apiError;
        }
      }
      return updatedItem as T;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update item');
      setError(error);
      // Don't show errors for connection issues
      if (onError && !(error as any).silent) {
        onError(error);
      }
      throw error;
    }
  }, [endpoint, mapItem, onError, syncManager]);

  // Remove item - delete from IndexedDB first, then sync with backend
  const remove = useCallback(async (item: T): Promise<void> => {
    // Validate userId exists (data isolation)
    const userId = localStorage.getItem("profit-pilot-user-id");
    if (!userId) {
      throw new Error('User not authenticated. Please login.');
    }
    
    try {
      await tryInitDB();
      const storeName = endpoint;
      const itemId = (item as any)._id || (item as any).id;
      if (!itemId) {
        throw new Error('Item ID is required for delete');
      }

      const previousItem =
        itemsRef.current.find((existing) =>
          recordMatchesDeleteIds(existing as { _id?: string; id?: number | string }, new Set([String(itemId)])),
        ) || item;

      const deleteIds = new Set(collectRecordIds(item as { _id?: string; id?: number | string }));
      for (const id of deleteIds) {
        pendingDeletedIdsRef.current.add(id);
      }

      // Update UI immediately — don't wait for IndexedDB or API
      setItems((prev) =>
        prev.filter((i) => !recordMatchesDeleteIds(i as { _id?: string; id?: number | string }, deleteIds)),
      );
      dispatchDataChanged({ endpoint, action: 'delete', itemId: String(itemId) });

      if (endpoint === "sales") {
        const pid = (item as any).productId?.toString();
        const qty = Number((item as any).quantity) || 0;
        if (pid && qty > 0) {
          applyProductStockDelta(pid, qty);
        }
      }

      // Invalidate cache for this endpoint since data changed
      apiCache.invalidateStore(endpoint);
      localStorage.setItem(`profit-pilot-${endpoint}-changed`, "true");

      // Delete from IndexedDB (offline-first)
      // Find the item in IndexedDB by matching _id or id, then delete using the stored numeric id
      try {
        const allItems = await getAllItems<T>(storeName);
        const rowsToDelete = allItems.filter((i) =>
          recordMatchesDeleteIds(i as { _id?: string; id?: number | string }, deleteIds),
        );

        for (const row of rowsToDelete) {
          const numericKey = (row as { id?: number | string }).id;
          if (typeof numericKey === "number" && Number.isFinite(numericKey)) {
            await deleteItem(storeName, numericKey);
          }
        }
      } catch (deleteError) {
        // Log but don't fail - UI update will still happen
        console.warn(`[useApi] Failed to delete from IndexedDB:`, deleteError);
      }

      // Try to sync with backend (silently fail if offline)
      try {
        if (endpoint === 'products') {
          await productApi.delete(itemId.toString());
        } else if (endpoint === 'sales') {
          await saleApi.delete(itemId.toString());
        } else if (endpoint === 'clients') {
          await clientApi.delete(itemId.toString());
        } else if (endpoint === 'vendors') {
          await vendorApi.delete(itemId.toString());
        } else if (endpoint === 'accounts') {
          await accountApi.delete(itemId.toString());
        } else if (endpoint === 'categoryBudgets') {
          await categoryBudgetApi.delete(itemId.toString());
        } else if (endpoint === 'schedules') {
          await scheduleApi.delete(itemId.toString());
        } else if (endpoint === 'bookings') {
          await bookingApi.delete(itemId.toString());
        } else if (endpoint === 'expenses') {
          await expenseApi.delete(itemId.toString());
        } else if (endpoint === 'incomes') {
          await incomeApi.delete(itemId.toString());
        } else if (endpoint === 'payrolls') {
          await payrollApi.delete(itemId.toString());
        } else if (endpoint === 'bills') {
          await billApi.delete(itemId.toString());
        } else if (endpoint === 'taxes') {
          await taxApi.delete(itemId.toString());
        } else if (endpoint === 'bankDeposits') {
          await bankDepositApi.delete(itemId.toString());
        } else if (endpoint === 'loans') {
          await loanApi.delete(itemId.toString());
        } else if (endpoint === 'invoices') {
          await invoiceApi.delete(itemId.toString());
        } else if (endpoint === 'documents') {
          await documentApi.delete(itemId.toString());
        } else {
          throw new Error(`Unknown endpoint: ${endpoint}`);
        }
        
        // Dispatch event to notify other components/pages to refresh after successful deletion
        if (endpoint === 'products') {
          window.dispatchEvent(new CustomEvent('products-should-refresh'));
        } else if (endpoint === 'sales') {
          window.dispatchEvent(new CustomEvent('sales-should-refresh'));
        }
      } catch (apiError: any) {
        // For sales and products, don't queue for sync - restore the removed item
        if (endpoint === 'sales' || endpoint === 'products') {
          for (const id of deleteIds) pendingDeletedIdsRef.current.delete(id);
          await addItem(storeName, {
            ...previousItem,
            userId,
          } as T);
          setItems((prev) => applyCreateToList(prev, previousItem as T, endpoint));
          dispatchDataChanged({ endpoint, action: 'create', item: previousItem });
          throw apiError;
        }
        
        const isNetworkError = isLikelyNetworkError(apiError);
        
        // Only queue for sync if it's a REAL network/connection error (for non-sales, non-products endpoints)
        if (isNetworkError) {
          // logger.log(`[useApi] Network error detected for ${endpoint} delete, queueing for sync:`, apiError);
          await syncManager.queueAction({
            type: "delete",
            store: storeName,
            data: item,
          });
        } else {
          for (const id of deleteIds) pendingDeletedIdsRef.current.delete(id);
          await addItem(storeName, {
            ...previousItem,
            userId,
          } as T);
          setItems((prev) => applyCreateToList(prev, previousItem as T, endpoint));
          dispatchDataChanged({ endpoint, action: 'create', item: previousItem });
          throw apiError;
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete item');
      setError(error);
      // Don't show errors for connection issues
      if (onError && !(error as any).silent) {
        onError(error);
      }
      throw error;
    }
  }, [endpoint, onError, syncManager]);

  // Bulk add (for sales) - require online connection, no offline support
  const bulkAdd = useCallback(async (itemsToAdd: T[]): Promise<void> => {
    if (endpoint !== 'sales') {
      throw new Error('Bulk add is only available for sales');
    }

    // Validate userId exists (data isolation)
    const userId = localStorage.getItem("profit-pilot-user-id");
    if (!userId) {
      throw new Error('User not authenticated. Please login.');
    }

    // For sales, require online connection - no offline support
    if (!navigator.onLine) {
      const error: any = new Error('Cannot record sales while offline. Please check your internet connection.');
      error.response = { connectionError: true };
      throw error;
    }

    try {
      await tryInitDB();
      const storeName = endpoint;
      
      // Don't save to IndexedDB first - only save after successful server response
      const itemsData = itemsToAdd.map((item) => {
        const itemData = { ...item };
        delete (itemData as any).id;
        delete (itemData as any)._id;
        
        // Ensure timestamp is present for each sale (preserve if exists, add if missing)
        if (!(itemData as any).timestamp) {
          (itemData as any).timestamp = new Date().toISOString();
        }
        
        return itemData;
      });

      const bulkStockPatches: { productId: string; qty: number }[] = [];
      for (const sale of itemsToAdd) {
        const pid = (sale as any).productId?.toString();
        const qty = Number((sale as any).quantity) || 0;
        if (pid && qty > 0) {
          bulkStockPatches.push({ productId: pid, qty });
          applyProductStockDelta(pid, -qty);
        }
      }
      
      try {
        // logger.log(`[useApi] Attempting to send bulk sales via DIRECT API call:`, itemsData);
        // logger.log(`[useApi] Online status: ${navigator.onLine}`);
        // logger.log(`[useApi] API Base URL: http://localhost:${import.meta.env.VITE_LOCAL_API_PORT || '3000'}/api`);
        
        // Direct API call - no offline storage, no syncing
        const response = await saleApi.createBulk(itemsData);
        
        // logger.log(`[useApi] ✓ Bulk sales API response received:`, response);
        if (!response || (!response.data && !response)) {
          throw new Error('Invalid response from bulk sales API. No data received.');
        }

        // Handle both response.data and direct response
        if (!response || (!response.data && !response)) {
          // logger.error(`[useApi] ✗ Invalid bulk response for ${endpoint}:`, response);
          throw new Error(`Invalid API response: No data received from server for bulk ${endpoint}`);
        }
        
          const responseData = response.data || response;
          // logger.log(`[useApi] Processing bulk response data for ${endpoint}:`, responseData);
        
        if (!responseData || (Array.isArray(responseData) && responseData.length === 0)) {
          // logger.error(`[useApi] ✗ Empty bulk response data for ${endpoint}:`, responseData);
          throw new Error(`Invalid API response: Empty data received from server for bulk ${endpoint}`);
        }
        
        const syncedItems = (Array.isArray(responseData) ? responseData : [responseData]).map((responseItem, index) => {
          const mapped = mapItem(responseItem);
          
          // Ensure timestamp is preserved for sales (use server timestamp if available, otherwise use original)
          if (!(mapped as any).timestamp && itemsToAdd[index] && (itemsToAdd[index] as any).timestamp) {
            (mapped as any).timestamp = (itemsToAdd[index] as any).timestamp;
          } else if (!(mapped as any).timestamp) {
            (mapped as any).timestamp = new Date().toISOString();
          }
          
          return mapped;
        });
        // logger.log(`[useApi] ✓ Successfully processed ${syncedItems.length} bulk sales from DIRECT API call`);
        
        // Add all synced items with server IDs and userId for data isolation
        for (const syncedItem of syncedItems) {
          const syncedItemWithUserId = {
            ...syncedItem,
            userId: userId
          } as T;
          await addItem(storeName, syncedItemWithUserId);
          }
          
          // Invalidate cache for this endpoint since data changed
          apiCache.invalidateStore(endpoint);
          localStorage.setItem(`profit-pilot-${endpoint}-changed`, "true");
          
        // Update UI - add synced items and remove duplicates
          setItems((prev) => deduplicateSales([...syncedItems as T[], ...prev]));
          for (const syncedItem of syncedItems) {
            dispatchDataChanged({ endpoint: 'sales', action: 'create', item: syncedItem });
            window.dispatchEvent(new CustomEvent('sale-recorded', { detail: { sale: syncedItem } }));
          }
      } catch (apiError: any) {
        for (const { productId, qty } of bulkStockPatches) {
          applyProductStockDelta(productId, qty);
        }
        // For sales, don't queue for sync - just throw the error
          throw apiError;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to bulk add items');
      setError(error);
      if (onError && !(error as any).silent) {
        onError(error);
      }
      throw error;
    }
  }, [endpoint, mapItem, onError, syncManager]);

  // Set items (for compatibility)
  const setItemsDirect = useCallback((newItems: T[]) => {
    setItems(newItems);
  }, []);

  // Rate limiting for refresh calls
  const lastRefreshTimeRef = useRef<number>(0);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const REFRESH_COOLDOWN = 10000; // 10 seconds minimum between refreshes (increased to reduce API calls)

  // Refresh function that resets error state with rate limiting (returns a Promise so callers can await a full reload)
  const refresh = useCallback((force = false): Promise<void> => {
    // For sales and products endpoints, always force refresh to get real data from API
    const isSalesEndpoint = endpoint === 'sales';
    const isProductsEndpoint = endpoint === 'products';
    const isExpensesEndpoint = endpoint === 'expenses';
    const isIncomesEndpoint = endpoint === 'incomes';
    const isPayrollsEndpoint = endpoint === 'payrolls';
    const isBillsEndpoint = endpoint === 'bills';
    const isTaxesEndpoint = endpoint === 'taxes';
    const isBankDepositsEndpoint = endpoint === 'bankDeposits';
    const isLoansEndpoint = endpoint === 'loans';
    const isInvoicesEndpoint = endpoint === 'invoices';
    const isDocumentsEndpoint = endpoint === 'documents';
    const isMoneyEndpoint = isExpensesEndpoint || isIncomesEndpoint || isPayrollsEndpoint || isBillsEndpoint || isTaxesEndpoint || isBankDepositsEndpoint || isLoansEndpoint || isInvoicesEndpoint || isDocumentsEndpoint;
    const shouldForce = force || isSalesEndpoint || isProductsEndpoint || isMoneyEndpoint;
    
    // Don't refresh if already loading (unless forced)
    if (isLoadingDataRef.current && !shouldForce) {
      return Promise.resolve();
    }
    
    hasErrorShownRef.current = false;
    
    // Clear any pending refresh
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
    
    // If forced (or sales endpoint), invalidate cache and refresh immediately
    if (shouldForce) {
      apiCache.invalidateStore(endpoint);
      // Clear the last refresh time to bypass cooldown
      lastRefreshTimeRef.current = 0;
      // Also clear the last refresh timestamp in localStorage to force API fetch
      localStorage.removeItem(`profit-pilot-${endpoint}-last-refresh`);
    }
    
    // For sales and products, always refresh immediately (bypass cooldown)
    if (isSalesEndpoint || isProductsEndpoint || isMoneyEndpoint || timeSinceLastRefresh >= REFRESH_COOLDOWN || shouldForce) {
      // Refresh immediately (loadData already checks isLoadingDataRef)
      // Use silent mode for forced refreshes so existing data stays visible (no skeleton flash)
      lastRefreshTimeRef.current = Date.now();
      return Promise.resolve(loadData({ silent: shouldForce, force: shouldForce })).then(() => undefined);
    }
    // Schedule refresh after cooldown period
    const remainingTime = REFRESH_COOLDOWN - timeSinceLastRefresh;
    return new Promise<void>((resolve, reject) => {
      refreshTimeoutRef.current = setTimeout(() => {
        try {
          if (!isLoadingDataRef.current) {
            lastRefreshTimeRef.current = Date.now();
            Promise.resolve(loadData())
              .then(() => resolve())
              .catch(reject);
          } else {
            resolve();
          }
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      }, remainingTime);
    });
  }, [loadData, endpoint]);

  // Reload from IndexedDB only (instant, no API call) - for optimistic updates
  // Merges with existing items to preserve optimistic updates
  const reloadFromIndexedDB = useCallback(async () => {
    const userId = localStorage.getItem("profit-pilot-user-id");
    if (!userId) {
      return;
    }

    try {
      await tryInitDB();
      const storeName = endpoint;
      const localItems = await getAllItems<T>(storeName);
      
      // Filter items by userId for data isolation
      const filteredItems = localItems.filter((item: any) => {
        if (item.userId !== undefined && item.userId !== userId) {
          return false;
        }
        return itemBelongsToCurrentScope(item);
      });
      
      if (filteredItems.length > 0) {
        const mappedItems = applyWorkspaceScope(
          filteredItems.map(mapItem),
        );
        
        // For sales, sort by timestamp (newest first)
        if (endpoint === 'sales') {
          mappedItems.sort((a, b) => {
            const aTime = (a as any).timestamp || (a as any).date;
            const bTime = (b as any).timestamp || (b as any).date;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
          });
        }
        
        // Merge with existing items to preserve optimistic updates
        // This ensures newly added items don't disappear if IndexedDB hasn't updated yet
        setItems((prevItems) => {
          // Create a map of existing items by ID for quick lookup
          const existingMap = new Map<string, T>();
          prevItems.forEach((item: any) => {
            const id = (item._id || item.id)?.toString();
            if (id) {
              existingMap.set(id, item);
            }
          });
          
          // Add all IndexedDB items to the map (will overwrite existing with same ID)
          mappedItems.forEach((item: any) => {
            const id = (item._id || item.id)?.toString();
            if (id) {
              existingMap.set(id, item);
            }
          });
          
          // Convert map back to array
          let merged = Array.from(existingMap.values());
          
          // For sales, re-sort after merge and drop local/server duplicates
          if (endpoint === 'sales') {
            merged = deduplicateSales(merged);
            return reconcileListWithPendingDeletions(merged);
          }
          
          return merged;
        });
        
        console.log(`[useApi] ${endpoint}: Reloaded ${mappedItems.length} items from IndexedDB (merged with existing)`);
      }
    } catch (error) {
      console.warn(`[useApi] ${endpoint}: Error reloading from IndexedDB:`, error);
    }
  }, [endpoint, mapItem, setItems, reconcileListWithPendingDeletions]);

  // ✅ WebSocket integration - listen for real-time updates (ONLY when socket is open)
  useEffect(() => {
    let websocketUnsubscribes: (() => void)[] = [];
    
    // Always subscribe - WebSocket manager will handle connection status
    // If not connected, messages will be queued or ignored, but subscription will be ready when connection is established
    console.log(`[useApi] Subscribing to WebSocket events for ${endpoint} (connection status: ${websocketManager.isConnected() ? 'connected' : 'not connected'})`);
    
    if (endpoint === 'products') {
      const unsubscribeCreated = websocketManager.subscribe('product:created', (product) => {
        if (!matchesRealtimeRecord(product)) return;
        if (isRemoteWorkspaceActor(product)) {
          notifyWorkspaceActivity({
            action: 'created',
            resource: 'product',
            actorName: product._actorName || 'Teammate',
            label: product.name,
          });
        }
        if (product && product._id) {
          const mapped = mapItem(product);
          setItems((prev) => {
            const exists = prev.some((p: any) => (p._id || p.id)?.toString() === product._id?.toString());
            if (exists) return prev;
            return [mapped, ...prev];
          });
        } else {
          refresh(true);
        }
      });

      const unsubscribeUpdated = websocketManager.subscribe('product:updated', (product) => {
        if (!matchesRealtimeRecord(product)) return;
        if (product && product._id) {
          const mapped = mapItem(product);
          setItems((prev) =>
            prev.map((p: any) =>
              (p._id || p.id)?.toString() === product._id?.toString() ? mapped : p,
            ),
          );
        } else {
          refresh(true);
        }
      });

      const unsubscribeDeleted = websocketManager.subscribe('product:deleted', (data) => {
        if (!matchesRealtimeRecord(data)) return;
        if (isRemoteWorkspaceActor(data)) {
          notifyWorkspaceActivity({
            action: 'deleted',
            resource: 'product',
            actorName: data._actorName || 'Teammate',
          });
        }
        if (data && data._id) {
          setItems((prev) =>
            prev.filter((p: any) => (p._id || p.id)?.toString() !== data._id?.toString()),
          );
        } else {
          refresh(true);
        }
      });

      websocketUnsubscribes = [unsubscribeCreated, unsubscribeUpdated, unsubscribeDeleted];
    } else if (endpoint === 'sales') {
      const unsubscribeCreated = websocketManager.subscribe('sale:created', (sale) => {
        if (!matchesRealtimeRecord(sale)) return;
        if (isRemoteWorkspaceActor(sale)) {
          notifyWorkspaceActivity({
            action: 'created',
            resource: 'sale',
            actorName: sale._actorName || 'Teammate',
            label: sale.product || sale.serviceName,
          });
        }
        if (sale && (sale._id || sale.id)) {
          setItems((prev) => deduplicateSales([mapItem(sale) as T, ...prev]));
        }
      });

      const unsubscribeUpdated = websocketManager.subscribe('sale:updated', (sale) => {
        if (!matchesRealtimeRecord(sale)) return;
        if (sale && (sale._id || sale.id)) {
          setItems((prev) =>
            prev.map((s: any) =>
              (s._id || s.id)?.toString() === (sale._id || sale.id)?.toString() ? mapItem(sale) : s,
            ),
          );
        } else {
          refresh(true);
        }
      });

      const unsubscribeDeleted = websocketManager.subscribe('sale:deleted', (data) => {
        if (!matchesRealtimeRecord(data)) return;
        if (isRemoteWorkspaceActor(data)) {
          notifyWorkspaceActivity({
            action: 'deleted',
            resource: 'sale',
            actorName: data._actorName || 'Teammate',
          });
        }
        const delId = data && (data._id ?? data.id)?.toString();
        if (delId) {
          pendingDeletedIdsRef.current.delete(delId);
          setItems((prev) =>
            prev.filter((s: any) => (s._id || s.id)?.toString() !== delId),
          );
        } else {
          refresh(true);
        }
      });

      websocketUnsubscribes = [unsubscribeCreated, unsubscribeUpdated, unsubscribeDeleted];
    }
    
    return () => {
      // Unsubscribe from WebSocket events
      websocketUnsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [endpoint, refresh, setItems, reloadFromIndexedDB]);

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
    reloadFromIndexedDB,
  };
}
