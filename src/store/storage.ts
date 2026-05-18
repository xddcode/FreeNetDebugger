import { Store } from '@tauri-apps/plugin-store';

let store: Store | null = null;
const memoryCache = new Map<string, string>();

export async function initStorage(): Promise<void> {
  store = await Store.load('fnd-store.json');

  // Pre-load all known keys into memory so Zustand can read synchronously
  const keys = [
    'fnd-store-v1-sessions',
    'fnd-store-v1-logs',
    'fnd-store-v1-settings',
    'fnd-store-v1-scripts',
  ];
  for (const key of keys) {
    const value = await store.get<string>(key);
    if (value !== undefined && value !== null) {
      memoryCache.set(key, value);
    }
  }
}

export function getStore(): Store {
  if (!store) {
    throw new Error('Store not initialized. Call initStorage() first.');
  }
  return store;
}

/** Synchronous read from memory cache (used by Zustand persist during hydration) */
export function getCachedItem(name: string): string | null {
  return memoryCache.get(name) ?? null;
}

/** Update memory cache + async write to disk */
export function setCachedItem(name: string, value: string): void {
  memoryCache.set(name, value);
  const s = store;
  if (s) {
    void s.set(name, value).then(() => s.save());
  }
}

/** Remove from memory cache + async delete from disk */
export function removeCachedItem(name: string): void {
  memoryCache.delete(name);
  const s = store;
  if (s) {
    void s.delete(name).then(() => s.save());
  }
}
