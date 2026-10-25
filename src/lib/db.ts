import type { Entry } from "./types";

const DB_NAME = "nsvector-lexicon-db";
const DB_VERSION = 1;
const STORE = "entries";
const LEGACY_KEY = "lexicon.entries.v1";
const MIGRATED_FLAG = "lexicon.entries.migrated.v1";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB недоступен"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("lemma", "lemma", { unique: false });
        store.createIndex("dueAt", "dueAt", { unique: false });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Не удалось открыть IndexedDB"));
  });
}

function readLegacyLocalStorage(): Entry[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Entry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLegacyFallback(entries: Entry[]) {
  try {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(entries));
  } catch {
    // quota — игнорируем
  }
}

async function putAll(db: IDBDatabase, entries: Entry[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    store.clear();
    for (const entry of entries) {
      store.put(entry);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAll(db: IDBDatabase): Promise<Entry[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as Entry[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

/** One-time move from localStorage blob → IndexedDB. */
async function migrateLegacyIfNeeded(db: IDBDatabase): Promise<void> {
  if (typeof localStorage === "undefined") return;
  if (localStorage.getItem(MIGRATED_FLAG) === "1") return;
  const legacy = readLegacyLocalStorage();
  if (legacy.length === 0) {
    localStorage.setItem(MIGRATED_FLAG, "1");
    return;
  }
  const existing = await getAll(db);
  if (existing.length === 0) {
    await putAll(db, legacy);
  }
  localStorage.setItem(MIGRATED_FLAG, "1");
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // keep legacy if remove fails
  }
}

export async function listEntries(): Promise<Entry[]> {
  try {
    const db = await openDatabase();
    await migrateLegacyIfNeeded(db);
    const list = await getAll(db);
    list.sort((a, b) => b.createdAt - a.createdAt);
    return list;
  } catch {
    const list = readLegacyLocalStorage();
    list.sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }
}

export async function replaceAllEntries(entries: Entry[]): Promise<void> {
  try {
    const db = await openDatabase();
    await putAll(db, entries);
    localStorage.setItem(MIGRATED_FLAG, "1");
  } catch {
    writeLegacyFallback(entries);
  }
}

export async function putEntry(entry: Entry): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const list = readLegacyLocalStorage().filter((e) => e.id !== entry.id);
    writeLegacyFallback([entry, ...list]);
  }
}

export async function deleteEntryById(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    writeLegacyFallback(readLegacyLocalStorage().filter((e) => e.id !== id));
  }
}
