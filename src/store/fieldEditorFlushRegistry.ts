/**
 * HTTP params/headers editors keep local React state while typing.
 * Before save / close / tab switch, the store calls flushAllFieldEditors()
 * to sync the in-memory tab draft (still not disk until saveSession).
 */

type FieldEditorFlush = () => void;

const flushers = new Map<string, Set<FieldEditorFlush>>();

export function registerFieldEditorFlush(sessionId: string, flush: FieldEditorFlush): () => void {
  let set = flushers.get(sessionId);
  if (!set) {
    set = new Set();
    flushers.set(sessionId, set);
  }
  set.add(flush);
  return () => {
    set?.delete(flush);
    if (set?.size === 0) {
      flushers.delete(sessionId);
    }
  };
}

export function flushAllFieldEditors(sessionId?: string): void {
  const ids = sessionId ? [sessionId] : [...flushers.keys()];
  for (const id of ids) {
    for (const flush of flushers.get(id) ?? []) {
      flush();
    }
  }
}
