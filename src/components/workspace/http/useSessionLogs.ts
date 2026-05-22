import { useCallback } from 'react';
import { useSessionStore, getAllSessions } from '../../../store';

/** Subscribe to one session's logs without pulling the full merged session view. */
export function useSessionLogs(sessionId: string) {
  return useSessionStore(
    useCallback(
      (s) => getAllSessions(s).find((sess) => sess.id === sessionId)?.logs ?? [],
      [sessionId],
    ),
  );
}

export function useSessionStatus(sessionId: string) {
  return useSessionStore(
    useCallback(
      (s) => getAllSessions(s).find((sess) => sess.id === sessionId)?.status ?? 'idle',
      [sessionId],
    ),
  );
}
