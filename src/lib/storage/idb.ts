/**
 * Minimal IndexedDB key/value helper. Kept dependency-free and tiny — it only
 * has to back the asset store until real object storage is wired up.
 */
const DB_NAME = "framelo";
const DB_VERSION = 1;
const STORE_NAME = "assets";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this browser"));
  }

  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Could not open local database"));
    }).catch((error: unknown) => {
      // Allow a later call to retry after a transient failure.
      dbPromise = null;
      throw error;
    });
  }

  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const request = work(transaction.objectStore(STORE_NAME));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Local database request failed"));
      }),
  );
}

export const idb = {
  get<T>(key: string): Promise<T | undefined> {
    return run<T | undefined>("readonly", (store) => store.get(key) as IDBRequest<T | undefined>);
  },
  set<T>(key: string, value: T): Promise<void> {
    return run("readwrite", (store) => store.put(value, key)).then(() => undefined);
  },
  delete(key: string): Promise<void> {
    return run("readwrite", (store) => store.delete(key)).then(() => undefined);
  },
  keys(): Promise<string[]> {
    return run<IDBValidKey[]>("readonly", (store) => store.getAllKeys()).then((keys) =>
      keys.map(String),
    );
  },
};
