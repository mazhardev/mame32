import { site } from '@/config/site';

export const STORES = [
  'profiles',
  'gameProgress',
  'highScores',
  'scoreHistory',
  'achievements',
  'statistics',
  'gameSettings',
  'savedGames',
  'replays',
  'activityHistory',
] as const;

export type StoreName = (typeof STORES)[number];

export interface DbStatus {
  available: boolean;
  error: string | null;
}

export const dbStatus: DbStatus = { available: true, error: null };

let dbPromise: Promise<IDBDatabase | null> | null = null;

function createSchema(db: IDBDatabase) {
  if (!db.objectStoreNames.contains('profiles')) db.createObjectStore('profiles', { keyPath: 'id' });
  if (!db.objectStoreNames.contains('gameProgress'))
    db.createObjectStore('gameProgress', { keyPath: 'gameId' });
  if (!db.objectStoreNames.contains('highScores')) {
    const s = db.createObjectStore('highScores', { keyPath: 'id' });
    s.createIndex('gameId', 'gameId', { unique: false });
  }
  if (!db.objectStoreNames.contains('scoreHistory')) {
    const s = db.createObjectStore('scoreHistory', { keyPath: 'id', autoIncrement: true });
    s.createIndex('gameId', 'gameId', { unique: false });
    s.createIndex('createdAt', 'createdAt', { unique: false });
  }
  if (!db.objectStoreNames.contains('achievements'))
    db.createObjectStore('achievements', { keyPath: 'achievementId' });
  if (!db.objectStoreNames.contains('statistics'))
    db.createObjectStore('statistics', { keyPath: 'gameId' });
  if (!db.objectStoreNames.contains('gameSettings'))
    db.createObjectStore('gameSettings', { keyPath: 'gameId' });
  if (!db.objectStoreNames.contains('savedGames')) {
    const s = db.createObjectStore('savedGames', { keyPath: 'id' });
    s.createIndex('gameId', 'gameId', { unique: false });
  }
  if (!db.objectStoreNames.contains('replays')) db.createObjectStore('replays', { keyPath: 'id' });
  if (!db.objectStoreNames.contains('activityHistory')) {
    const s = db.createObjectStore('activityHistory', { keyPath: 'id', autoIncrement: true });
    s.createIndex('createdAt', 'createdAt', { unique: false });
  }
}

/**
 * Opens (and lazily migrates) the arcade database.
 * Resolves to null when IndexedDB is blocked (private mode, disabled storage);
 * every caller degrades to in-memory behaviour rather than throwing.
 */
export function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      dbStatus.available = false;
      dbStatus.error = 'IndexedDB is not supported in this browser.';
      resolve(null);
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(site.dbName, site.dbVersion);
    } catch (err) {
      dbStatus.available = false;
      dbStatus.error = String(err);
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => createSchema(request.result);
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => {
      dbStatus.available = false;
      dbStatus.error = request.error?.message ?? 'IndexedDB could not be opened.';
      console.warn('[storage] IndexedDB unavailable:', dbStatus.error);
      resolve(null);
    };
    request.onblocked = () => {
      dbStatus.error = 'Another tab is blocking a database upgrade.';
    };
  });
  return dbPromise;
}

function tx<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        try {
          const transaction = db.transaction(store, mode);
          const request = run(transaction.objectStore(store));
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => {
            console.warn('[storage] operation failed', store, request.error?.message);
            resolve(null);
          };
        } catch (err) {
          console.warn('[storage] transaction failed', store, err);
          resolve(null);
        }
      }),
  );
}

export function dbGet<T>(store: StoreName, key: IDBValidKey): Promise<T | null> {
  return tx<T>(store, 'readonly', (s) => s.get(key) as IDBRequest<T>);
}

export function dbGetAll<T>(store: StoreName): Promise<T[]> {
  return tx<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>).then((r) => r ?? []);
}

export function dbGetAllByIndex<T>(store: StoreName, index: string, key: IDBValidKey): Promise<T[]> {
  return tx<T[]>(store, 'readonly', (s) => s.index(index).getAll(key) as IDBRequest<T[]>).then(
    (r) => r ?? [],
  );
}

export function dbPut<T>(store: StoreName, value: T): Promise<IDBValidKey | null> {
  return tx<IDBValidKey>(store, 'readwrite', (s) => s.put(value) as IDBRequest<IDBValidKey>);
}

export function dbDelete(store: StoreName, key: IDBValidKey): Promise<void> {
  return tx(store, 'readwrite', (s) => s.delete(key) as IDBRequest<undefined>).then(() => undefined);
}

export function dbClear(store: StoreName): Promise<void> {
  return tx(store, 'readwrite', (s) => s.clear() as IDBRequest<undefined>).then(() => undefined);
}

export async function dbClearAll(): Promise<void> {
  for (const store of STORES) await dbClear(store);
}

/** Test hook: drop the cached connection so a fresh handle is opened. */
export function resetDbForTests() {
  dbPromise = null;
  dbStatus.available = true;
  dbStatus.error = null;
}
