const DB_NAME = 'time-tracker';
const DB_VERSION = 1;
const STORE_NAME = 'tasks';
const STORE_KEY = 'tasks';
const LEGACY_STORAGE_KEY = 'time-tracker.v1';

let dbPromise = null;

function hasIndexedDB() {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function getLocalStorage() {
  return typeof window !== 'undefined' ? window.localStorage : null;
}

function openDb() {
  if (!hasIndexedDB()) {
    return Promise.reject(new Error('IndexedDB is not available in this environment'));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => {
        reject(request.error || new Error('Unable to open IndexedDB'));
      };
    });
  }
  return dbPromise;
}

async function runTransaction(mode, handler) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    handler(store, tx);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
  });
}

async function readKey(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function toPlainTasks(tasks) {
  try {
    return JSON.parse(JSON.stringify(Array.isArray(tasks) ? tasks : []));
  } catch {
    return [];
  }
}

export async function saveTasksToDb(tasks) {
  const payload = toPlainTasks(tasks);
  try {
    await runTransaction('readwrite', (store) => {
      store.put(payload, STORE_KEY);
    });
  } catch (err) {
    console.warn('IndexedDB save failed, falling back to localStorage', err);
    try {
      const localStore = getLocalStorage();
      if (!localStore) throw err;
      localStore.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ tasks: payload }));
    } catch (storageErr) {
      console.warn('Legacy localStorage save failed', storageErr);
      throw storageErr;
    }
    return;
  }
}

export async function loadTasksFromDb() {
  try {
    const stored = await readKey(STORE_KEY);
    if (Array.isArray(stored)) {
      return stored;
    }
  } catch (err) {
    console.warn('IndexedDB load failed, trying localStorage fallback', err);
  }
  try {
    const localStore = getLocalStorage();
    if (!localStore) return [];
    const raw = localStore.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.tasks)) {
      return parsed.tasks;
    }
  } catch (err) {
    console.warn('Legacy localStorage load failed', err);
  }
  return [];
}

export async function clearTasksInDb() {
  try {
    await runTransaction('readwrite', (store) => {
      store.delete(STORE_KEY);
    });
  } catch (err) {
    console.warn('IndexedDB clear failed, trying localStorage fallback', err);
    try {
      const localStore = getLocalStorage();
      if (!localStore) throw err;
      localStore.removeItem(LEGACY_STORAGE_KEY);
    } catch (storageErr) {
      console.warn('Legacy localStorage clear failed', storageErr);
      throw storageErr;
    }
    return;
  }
}
