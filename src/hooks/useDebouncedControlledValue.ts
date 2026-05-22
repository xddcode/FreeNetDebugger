import { useCallback, useEffect, useRef, useState } from 'react';

export function useDebouncedControlledValue<T>(
  value: T,
  onChange: (next: T) => void,
  debounceMs?: number,
): {
  draft: T;
  setDraft: (next: T) => void;
  flush: (next?: T) => void;
} {
  const [draft, setDraftState] = useState(value);
  const draftRef = useRef(draft);
  const timerRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (Object.is(value, draftRef.current)) {
      return;
    }
    draftRef.current = value;
    setDraftState(value);
  }, [value]);

  const flush = useCallback((next?: T) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const committed = next ?? draftRef.current;
    onChangeRef.current(committed);
  }, []);

  const setDraft = useCallback(
    (next: T) => {
      draftRef.current = next;
      setDraftState(next);

      if (!debounceMs) {
        onChangeRef.current(next);
        return;
      }

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        onChangeRef.current(next);
      }, debounceMs);
    },
    [debounceMs],
  );

  useEffect(() => {
    return () => {
      if (debounceMs && timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        onChangeRef.current(draftRef.current);
      }
    };
  }, [debounceMs]);

  return { draft, setDraft, flush };
}
