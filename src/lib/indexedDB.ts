// IndexedDB utilities for offline storage

const DB_NAME = "stockaDB";
const DB_VERSION = 5;

interface StoreConfig {
  name: string;
  keyPath: string;
  autoIncrement?: boolean;
}

const stores: StoreConfig[] = [
  { name: "products", keyPath: "id", autoIncrement: false },
  { name: "sales", keyPath: "id", autoIncrement: false },
  { name: "clients", keyPath: "id", autoIncrement: false },
  { name: "schedules", keyPath: "id", autoIncrement: false },
  { name: "bookings", keyPath: "id", autoIncrement: false },
  { name: "expenses", keyPath: "id", autoIncrement: false },
  { name: "settings", keyPath: "id", autoIncrement: false },
  { name: "syncQueue", keyPath: "id", autoIncrement: true },
];

let db: IDBDatabase | null = null;
let initPromise: Promise<IDBDatabase> | null = null;
let indexedDBDisabled = false;

export function isIndexedDBAvailable(): boolean {
  return !indexedDBDisabled && typeof indexedDB !== "undefined";
}

function isRecoverableIndexedDBError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = (error as DOMException).name ?? "";
  const message = String((error as Error).message ?? "");
  return (
    name === "UnknownError" ||
    name === "InvalidStateError" ||
    name === "AbortError" ||
    message.includes("Internal error") ||
    message.includes("backing store")
  );
}

function attachDatabaseLifecycle(database: IDBDatabase): void {
  database.onclose = () => {
    db = null;
    initPromise = null;
  };
  database.onversionchange = () => {
    database.close();
    db = null;
    initPromise = null;
  };
}

function runUpgrade(event: IDBVersionChangeEvent): void {
  const database = (event.target as IDBOpenDBRequest).result;

  stores.forEach((store) => {
    if (!database.objectStoreNames.contains(store.name)) {
      const objectStore = database.createObjectStore(store.name, {
        keyPath: store.keyPath,
        autoIncrement: store.autoIncrement,
      });
      objectStore.createIndex("id", "id", { unique: true });
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
      // Another tab may be upgrading; the open will complete when that tab closes.
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
  if (typeof indexedDB === "undefined") {
    indexedDBDisabled = true;
    throw new Error("IndexedDB is not available in this browser");
  }

  try {
    return await openDatabaseOnce();
  } catch (error) {
    if (!isRecoverableIndexedDBError(error)) {
      throw error;
    }

    // Corrupted or locked DB — delete and recreate once.
    db = null;
    try {
      await deleteDatabase();
      await new Promise((resolve) => setTimeout(resolve, 150));
      return await openDatabaseOnce();
    } catch (retryError) {
      indexedDBDisabled = true;
      throw retryError;
    }
  }
}

export const initDB = (): Promise<IDBDatabase> => {
  if (indexedDBDisabled) {
    return Promise.reject(new Error("IndexedDB is unavailable"));
  }

  if (db) {
    return Promise.resolve(db);
  }

  if (!initPromise) {
    initPromise = initDBInternal()
      .then((database) => {
        db = database;
        return database;
      })
      .catch((error) => {
        initPromise = null;
        if (isRecoverableIndexedDBError(error)) {
          indexedDBDisabled = true;
        }
        throw error;
      });
  }

  return initPromise;
};

export const getDB = async (): Promise<IDBDatabase> => {
  if (indexedDBDisabled) {
    throw new Error("IndexedDB is unavailable");
  }
  if (!db) {
    db = await initDB();
  }
  return db;
};

// Generic CRUD operations
export const addItem = async <T extends { id?: number; _id?: string }>(storeName: string, item: T): Promise<T> => {
  if (!isIndexedDBAvailable()) return item;

  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);

    // Ensure item has an id (use _id if id doesn't exist, or generate one)
    // Deep clone and remove any non-serializable values (Promises, functions, etc.)
    const itemWithId = JSON.parse(JSON.stringify(item));
    if (!itemWithId.id) {
      if (itemWithId._id) {
        // Convert _id to numeric id if possible, otherwise use a hash
        const idStr = String(itemWithId._id);
        itemWithId.id = idStr.length > 10 ? parseInt(idStr.slice(-10), 36) : parseInt(idStr, 36) || Date.now();
      } else if (storeName !== "syncQueue") {
        // Generate a temporary ID for non-syncQueue stores
        itemWithId.id = Date.now() + Math.random();
      }
    }

    const request = store.add(itemWithId);

    request.onsuccess = () => {
      // For autoIncrement stores (like syncQueue), get the generated ID
      if (storeName === "syncQueue") {
        const id = request.result as number;
        const itemWithGeneratedId = { ...itemWithId, id } as T;
        resolve(itemWithGeneratedId);
      } else {
        // For stores without autoIncrement, item already has ID
        resolve(itemWithId as T);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const updateItem = async <T extends { id?: number; _id?: string }>(storeName: string, item: T): Promise<void> => {
  if (!isIndexedDBAvailable()) return;

  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);

    // Ensure item has an id
    // Deep clone and remove any non-serializable values (Promises, functions, etc.)
    const itemWithId = JSON.parse(JSON.stringify(item));
    if (!itemWithId.id && itemWithId._id) {
      const idStr = String(itemWithId._id);
      itemWithId.id = idStr.length > 10 ? parseInt(idStr.slice(-10), 36) : parseInt(idStr, 36) || Date.now();
    }

    const request = store.put(itemWithId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deleteItem = async (storeName: string, id: number): Promise<void> => {
  if (!isIndexedDBAvailable()) return;

  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getItem = async <T>(storeName: string, id: number): Promise<T | undefined> => {
  if (!isIndexedDBAvailable()) return undefined;

  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
};

export const getAllItems = async <T>(storeName: string): Promise<T[]> => {
  if (!isIndexedDBAvailable()) return [];

  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
};

export const clearStore = async (storeName: string): Promise<void> => {
  if (!isIndexedDBAvailable()) return;

  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Clear all stores (for logout/data isolation)
export const clearAllStores = async (): Promise<void> => {
  if (!isIndexedDBAvailable()) return;

  try {
    const database = await getDB();
    const clearPromises = stores.map((store) => {
      return new Promise<void>((resolve, reject) => {
        const transaction = database.transaction([store.name], "readwrite");
        const storeObj = transaction.objectStore(store.name);
        const request = storeObj.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(clearPromises);
  } catch (error) {
    throw error;
  }
};
