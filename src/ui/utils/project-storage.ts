import type { SdvProjectFile } from '../../data/models/index.js';

const RECENT_STORAGE_KEY = 'sdv_mod_creator_recent_projects';
const IDB_NAME = 'sdv_mod_creator_db';
const IDB_STORE = 'workspace';
const IDB_KEY = 'recent_projects';

export function isSdvProjectFile(value: unknown): value is SdvProjectFile {
  return (
    typeof value === 'object' &&
    value !== null &&
    'formatVersion' in value &&
    'metadata' in value &&
    'edits' in value
  );
}

export function loadRecentProjectsSync(): readonly SdvProjectFile[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (raw === null) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSdvProjectFile) : [];
  } catch {
    return [];
  }
}

function openProjectDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = (): void => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = (): void => { resolve(req.result); };
    req.onerror = (): void => { reject(req.error ?? new Error('IndexedDB open failed')); };
  });
}

export async function loadRecentProjectsFromDb(): Promise<readonly SdvProjectFile[] | null> {
  if (typeof indexedDB === 'undefined') {
    return null;
  }
  try {
    const db = await openProjectDb();
    return await new Promise<readonly SdvProjectFile[] | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = (): void => {
        const val: unknown = req.result;
        resolve(Array.isArray(val) ? val.filter(isSdvProjectFile) : null);
      };
      req.onerror = (): void => { reject(req.error ?? new Error('IndexedDB read failed')); };
    });
  } catch {
    return null;
  }
}

function stripBinaryAssetsForFallback(
  projects: readonly SdvProjectFile[],
): readonly SdvProjectFile[] {
  return projects.slice(0, 8).map((proj) => ({
    ...proj,
    assets: proj.assets.map((asset) => ({
      id: asset.id,
      relativePath: asset.relativePath,
      kind: asset.kind,
    })),
  }));
}

export async function saveRecentProjectsAsync(
  projects: readonly SdvProjectFile[],
): Promise<boolean> {
  const sliced = projects.slice(0, 8);
  let savedToIdb = false;

  if (typeof indexedDB !== 'undefined') {
    try {
      const db = await openProjectDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(sliced, IDB_KEY);
        tx.oncomplete = (): void => { resolve(); };
        tx.onerror = (): void => { reject(tx.error ?? new Error('IndexedDB write failed')); };
      });
      savedToIdb = true;
    } catch {
      savedToIdb = false;
    }
  }

  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(sliced));
    return true;
  } catch {
    try {
      localStorage.setItem(
        RECENT_STORAGE_KEY,
        JSON.stringify(stripBinaryAssetsForFallback(sliced)),
      );
      return savedToIdb;
    } catch {
      return savedToIdb;
    }
  }
}
