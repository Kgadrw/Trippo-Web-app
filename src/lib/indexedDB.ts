// IndexedDB utilities for offline storage

const DB_NAME = "stockaDB";
const DB_VERSION = 2;

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
  { name: "settings", keyPath: "id", autoIncrement: false },
  { name: "syncQueue", keyPath: "id", autoIncrement: true },
];

let db: IDBDatabase | null = null;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
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
    };
  });
};

export const getDB = async (): Promise<IDBDatabase> => {
  if (!db) {
    db = await initDB();
  }
  return db;
};

// Generic CRUD operations
export const addItem = async <T extends { id?: number }>(storeName: string, item: T): Promise<T> => {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.add(item);

    request.onsuccess = () => {
      // For autoIncrement stores (like syncQueue), get the generated ID
      if (storeName === "syncQueue") {
        const id = request.result as number;
        const itemWithId = { ...item, id } as T;
        resolve(itemWithId);
      } else {
        // For stores without autoIncrement, item already has ID
        resolve(item);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const updateItem = async <T>(storeName: string, item: T): Promise<void> => {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deleteItem = async (storeName: string, id: number): Promise<void> => {
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
    console.error("Error clearing IndexedDB stores:", error);
    throw error;
  }
};
