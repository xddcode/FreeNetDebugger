import { Store } from '@tauri-apps/plugin-store';
import { STORAGE_KEY } from '../config/constants';

/**
 * Persistence policy
 * ──────────────────
 * - "Eager" keys (settings / scripts): every change immediately flushed to disk.
 *   These mutate rarely so the I/O is negligible.
 *
 * - "Deferred" keys (sessions): updates only mutate the in-memory cache.
 *   Disk write is triggered explicitly via `flushDeferred()` — invoked when the
 *   user hits ⌘/Ctrl+S, confirms the close dialog, or saves a tab.
 *
 *   This gives us a Bruno / VSCode-style "dirty buffer" model: typing into the
 *   sidebar never touches the disk, the user is in charge of when state is
 *   persisted.
 */
const DEFERRED_KEYS: ReadonlySet<string> = new Set([`${STORAGE_KEY}-sessions`]);

let store: Store | null = null;
const memoryCache = new Map<string, string>();
const pendingWrites = new Set<Promise<void>>();
const dirtyDeferred = new Set<string>();

export async function initStorage(): Promise<void> {
  store = await Store.load('fnd-store.json');

  // Pre-load all known keys so Zustand can read synchronously during hydration.
  const keys = [
    `${STORAGE_KEY}-sessions`,
    `${STORAGE_KEY}-logs`,
    `${STORAGE_KEY}-settings`,
    `${STORAGE_KEY}-scripts`,
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

/** Synchronous read from memory cache (used by Zustand persist during hydration). */
export function getCachedItem(name: string): string | null {
  return memoryCache.get(name) ?? null;
}

/**
 * Mutate in-memory cache.
 * - Eager keys schedule a write to disk immediately.
 * - Deferred keys only mark dirty; caller must invoke `flushDeferred()` to persist.
 */
export function setCachedItem(name: string, value: string): void {
  if (memoryCache.get(name) === value) {
    return;
  }
  memoryCache.set(name, value);

  if (DEFERRED_KEYS.has(name)) {
    dirtyDeferred.add(name);
    return;
  }

  scheduleWrite(name, value);
}

export function removeCachedItem(name: string): void {
  memoryCache.delete(name);
  dirtyDeferred.delete(name);
  const s = store;
  if (!s) {
    return;
  }
  trackPending(s.delete(name).then(() => s.save()));
}

/** Returns true if any deferred key has pending in-memory changes not yet on disk. */
export function hasDeferredChanges(): boolean {
  return dirtyDeferred.size > 0;
}

/** Persist all deferred keys to disk and wait until done. */
export async function flushDeferred(): Promise<void> {
  if (dirtyDeferred.size === 0) {
    await drainPending();
    return;
  }
  const keys = Array.from(dirtyDeferred);
  dirtyDeferred.clear();
  for (const key of keys) {
    const value = memoryCache.get(key);
    if (value !== undefined) {
      scheduleWrite(key, value);
    }
  }
  await drainPending();
}

/** Wait for everything currently scheduled (eager + deferred-just-flushed) to land on disk. */
export async function flushStorage(): Promise<void> {
  await flushDeferred();
}

function scheduleWrite(name: string, value: string): void {
  const s = store;
  if (!s) {
    return;
  }
  trackPending(s.set(name, value).then(() => s.save()));
}

function trackPending(p: Promise<void>): void {
  pendingWrites.add(p);
  const done = () => pendingWrites.delete(p);
  p.then(done, done);
}

async function drainPending(): Promise<void> {
  while (pendingWrites.size > 0) {
    await Promise.all(Array.from(pendingWrites));
  }
}
