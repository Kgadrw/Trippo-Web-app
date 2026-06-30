// IndexedDB utilities for offline storage

const DB_NAME = "stockaDB";
const DB_VERSION = 16;

interface StoreConfig {
  name: string;
  keyPath: string;
  autoIncrement?: boolean;
}

const stores: StoreConfig[] = [
  { name: "products", keyPath: "id", autoIncrement: false },
  { name: "sales", keyPath: "id", autoIncrement: false },
  { name: "clients", keyPath: "id", autoIncrement: false },
  { name: "vendors", keyPath: "id", autoIncrement: false },
  { name: "accounts", keyPath: "id", autoIncrement: false },
  { name: "categoryBudgets", keyPath: "id", autoIncrement: false },
  { name: "schedules", keyPath: "id", autoIncrement: false },
  { name: "bookings", keyPath: "id", autoIncrement: false },
  { name: "expenses", keyPath: "id", autoIncrement: false },
  { name: "incomes", keyPath: "id", autoIncrement: false },
  { name: "payrolls", keyPath: "id", autoIncrement: false },
  { name: "bills", keyPath: "id", autoIncrement: false },
  { name: "taxes", keyPath: "id", autoIncrement: false },
  { name: "bankDeposits", keyPath: "id", autoIncrement: false },
  { name: "loans", keyPath: "id", autoIncrement: false },
  { name: "invoices", keyPath: "id", autoIncrement: false },
  { name: "documents", keyPath: "id", autoIncrement: false },
  { name: "assets", keyPath: "id", autoIncrement: false },
  { name: "settings", keyPath: "id", autoIncrement: false },
  { name: "syncQueue", keyPath: "id", autoIncrement: true },
];

let db: IDBDatabase | null = null;
let initPromise: Promise<IDBDatabase> | null = null;
let lastInitFailureAt = 0;
const INIT_RETRY_COOLDOWN_MS = 3000;

export function isIndexedDBSupported(): boolean {
  return typeof indexedDB !== "undefined";
}

export function isIndexedDBAvailable(): boolean {
  return isIndexedDBSupported() && db !== null;
}

function isRecoverableIndexedDBError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = (error as DOMException).name ?? "";
  const message = String((error as Error).message ?? "");
  return (
    name === "UnknownError" ||
    name === "InvalidStateError" ||
    name === "AbortError" ||
    name === "QuotaExceededError" ||
    message.includes("Internal error") ||
    message.includes("backing store")
  );
}

function resetConnection(): void {
  db = null;
  initPromise = null;
}

function attachDatabaseLifecycle(database: IDBDatabase): void {
  database.onclose = () => {
    resetConnection();
  };
  database.onversionchange = () => {
    database.close();
    resetConnection();
  };
}

function runUpgrade(event: IDBVersionChangeEvent): void {
  const database = (event.target as IDBOpenDBRequest).result;

  stores.forEach((store) => {
    if (!database.objectStoreNames.contains(store.name)) {
      database.createObjectStore(store.name, {
        keyPath: store.keyPath,
        autoIncrement: store.autoIncrement,
      });
    }
  });
}

function openDatabaseOnce(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open IndexedDB"));
    };

    request.onblocked = () => {
      // Another tab may be upgrading; open completes when that tab closes.
    };

    request.onupgradeneeded = (event) => {
      runUpgrade(event);
    };

    request.onsuccess = () => {
      const database = request.result;
      attachDatabaseLifecycle(database);
      resolve(database);
    };
  });
}

function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to delete IndexedDB"));
    request.onblocked = () => {
      // Deletion waits until other connections close.
    };
  });
}

async function initDBInternal(): Promise<IDBDatabase> {
  if (!isIndexedDBSupported()) {
    throw new Error("IndexedDB is not available in this browser");
  }

  try {
    return await openDatabaseOnce();
  } catch (error) {
    if (!isRecoverableIndexedDBError(error)) {
      throw error;
    }

    resetConnection();
    await deleteDatabase();
    await new Promise((resolve) => setTimeout(resolve, 250));
    return await openDatabaseOnce();
  }
}

export const initDB = (): Promise<IDBDatabase> => {
  if (!isIndexedDBSupported()) {
    return Promise.reject(new Error("IndexedDB is not available in this browser"));
  }

  if (db) {
    return Promise.resolve(db);
  }

  const now = Date.now();
  if (lastInitFailureAt && now - lastInitFailureAt < INIT_RETRY_COOLDOWN_MS && !initPromise) {
    return Promise.reject(new Error("IndexedDB temporarily unavailable"));
  }

  if (!initPromise) {
    initPromise = initDBInternal()
      .then((database) => {
        db = database;
        lastInitFailureAt = 0;
        return database;
      })
      .catch((error) => {
        resetConnection();
        lastInitFailureAt = Date.now();
        throw error;
      });
  }

  return initPromise;
};

/** Open IndexedDB if possible; returns null instead of throwing (API-only fallback). */
export async function tryInitDB(): Promise<IDBDatabase | null> {
  if (!isIndexedDBSupported()) return null;
  try {
    return await initDB();
  } catch {
    return null;
  }
}

export const getDB = async (): Promise<IDBDatabase> => {
  const database = await tryInitDB();
  if (!database) {
    throw new Error("IndexedDB is unavailable");
  }
  return database;
};

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
  fallback: T,
): Promise<T> {
  if (!isIndexedDBSupported()) return fallback;
  try {
    const database = await tryInitDB();
    if (!database) return fallback;
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction([storeName], mode);
      const store = transaction.objectStore(storeName);
      const request = run(store);
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return fallback;
  }
}

function prepareItemWithId<T extends { id?: number; _id?: string }>(
  storeName: string,
  item: T,
): T {
  const itemWithId = JSON.parse(JSON.stringify(item)) as T;
  if (!itemWithId.id) {
    if (itemWithId._id) {
      const idStr = String(itemWithId._id);
      itemWithId.id =
        idStr.length > 10
          ? parseInt(idStr.slice(-10), 36)
          : parseInt(idStr, 36) || Date.now();
    } else if (storeName !== "syncQueue") {
      itemWithId.id = Date.now() + Math.random();
    }
  }
  return itemWithId;
}

// Generic CRUD operations — never throw; no-op when IndexedDB is unavailable
export const addItem = async <T extends { id?: number; _id?: string }>(
  storeName: string,
  item: T,
): Promise<T> => {
  const itemWithId = prepareItemWithId(storeName, item);

  if (!isIndexedDBSupported()) return itemWithId;

  try {
    const database = await tryInitDB();
    if (!database) return itemWithId;

    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.add(itemWithId);

      request.onsuccess = () => {
        if (storeName === "syncQueue") {
          const id = request.result as number;
          resolve({ ...itemWithId, id } as T);
        } else {
          resolve(itemWithId);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return itemWithId;
  }
};

export const updateItem = async <T extends { id?: number; _id?: string }>(
  storeName: string,
  item: T,
): Promise<void> => {
  if (!isIndexedDBSupported()) return;

  const itemWithId = prepareItemWithId(storeName, item);
  if (!itemWithId.id && itemWithId._id) {
    const idStr = String(itemWithId._id);
    itemWithId.id =
      idStr.length > 10
        ? parseInt(idStr.slice(-10), 36)
        : parseInt(idStr, 36) || Date.now();
  }

  try {
    const database = await tryInitDB();
    if (!database) return;

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(itemWithId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // API-only mode
  }
};

export const deleteItem = async (storeName: string, id: number): Promise<void> => {
  if (!isIndexedDBSupported()) return;

  try {
    const database = await tryInitDB();
    if (!database) return;

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // API-only mode
  }
};

export const getItem = async <T>(storeName: string, id: number): Promise<T | undefined> => {
  return withStore<T | undefined>(
    storeName,
    "readonly",
    (store) => store.get(id),
    undefined,
  );
};

export const getAllItems = async <T>(storeName: string): Promise<T[]> => {
  return withStore<T[]>(storeName, "readonly", (store) => store.getAll(), []);
};

export const clearStore = async (storeName: string): Promise<void> => {
  if (!isIndexedDBSupported()) return;

  try {
    const database = await tryInitDB();
    if (!database) return;

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // API-only mode
  }
};

export const clearAllStores = async (): Promise<void> => {
  if (!isIndexedDBSupported()) return;

  try {
    const database = await tryInitDB();
    if (!database) return;

    await Promise.all(
      stores.map(
        (store) =>
          new Promise<void>((resolve, reject) => {
            const transaction = database.transaction([store.name], "readwrite");
            const storeObj = transaction.objectStore(store.name);
            const request = storeObj.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          }),
      ),
    );
  } catch {
    // API-only mode
  }
};
