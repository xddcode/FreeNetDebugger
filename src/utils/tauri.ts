import { invoke as _invoke } from '@tauri-apps/api/core';

/** Returns true when running inside a real Tauri window. */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Safe wrapper around Tauri invoke.
 * Throws a user-friendly error when called outside the Tauri runtime
 * (e.g. plain browser during UI development).
 */
export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri — use `bun tauri dev` to start the app');
  }
  return _invoke<T>(cmd, args);
}
