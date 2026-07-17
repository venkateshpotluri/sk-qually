import type { Project } from '../types';

/**
 * IndexedDB persistence. Study data lives only in the user's browser —
 * one object store of projects, keyed by project id. Video files are never
 * stored (too large); users re-attach them per session.
 */

const DB_NAME = 'qually';
const DB_VERSION = 1;
const STORE = 'projects';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Could not open local database.'));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('Local database error.'));
    });
  } finally {
    db.close();
  }
}

export async function loadAllProjects(): Promise<Project[]> {
  const all = await withStore<Project[]>('readonly', (s) => s.getAll() as IDBRequest<Project[]>);
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function loadProject(id: string): Promise<Project | undefined> {
  return withStore<Project | undefined>('readonly', (s) => s.get(id) as IDBRequest<Project | undefined>);
}

export async function saveProject(project: Project): Promise<void> {
  await withStore('readwrite', (s) => s.put(project));
}

export async function deleteProject(id: string): Promise<void> {
  await withStore('readwrite', (s) => s.delete(id));
}

/** Delete the entire local database — the "Clear all local data" control. */
export function clearAllData(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onblocked = () => resolve();
    req.onerror = () => reject(req.error ?? new Error('Could not clear local data.'));
  });
}
