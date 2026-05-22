import { useRef, useCallback, useEffect, type RefObject } from 'react';
import { useSessionStore, getAllSessions } from '../store';
import { isStreamSession } from '../types';
import { bytesToDisplay, formatTimestamp } from '../utils/encoding';
import { FILE_FLUSH_INTERVAL } from '../config/constants';

export interface FileSaverState {
  fileHandleRef: RefObject<FileSystemFileHandle | null>;
  lastSavedLogIdRef: RefObject<number>;
  appendLine: (line: string) => void;
}

/**
 * Hook that manages append-only file writing for a session's received logs.
 * Uses the File System Access API when available; falls back are handled by caller.
 */
export function useFileSaver(sessionId: string): FileSaverState {
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);
  const writeChainRef = useRef<Promise<void>>(Promise.resolve());
  const lastSavedLogIdRef = useRef<number>(0);

  const appendLine = useCallback((line: string) => {
    const handle = fileHandleRef.current;
    if (!handle) {
      return;
    }
    writeChainRef.current = writeChainRef.current
      .then(async () => {
        const file = await handle.getFile();
        const writer = await handle.createWritable({ keepExistingData: true });
        await writer.write({ type: 'write', position: file.size, data: line });
        await writer.close();
      })
      .catch((err) => {
        const st = useSessionStore.getState();
        st.appendLog(sessionId, {
          timestamp: Date.now(),
          direction: 'system',
          data: Array.from(new TextEncoder().encode(`File write error: ${err}`)),
        });
      });
  }, [sessionId]);

  useEffect(() => {
    const flushToFile = () => {
      const st = useSessionStore.getState();
      const live = getAllSessions(st).find((s) => s.id === sessionId);
      if (!live || !isStreamSession(live) || !live.receiveSettings.saveToFile || !fileHandleRef.current || live.logs.length === 0) {
        return;
      }

      const asciiMode = live.receiveSettings.asciiNonPrintable ?? 'DOT';
      const lineBreak = live.receiveSettings.autoNewline ? '\n' : '';
      const pendingRecvLines: string[] = [];

      for (const log of live.logs) {
        if (log.id <= lastSavedLogIdRef.current) {
          continue;
        }
        if (log.direction !== 'recv') {
          continue;
        }
        const line = `[${formatTimestamp(log.timestamp)}] RECV: ${
          bytesToDisplay(log.data, live.receiveSettings.encoding, asciiMode)
        }${lineBreak}`;
        pendingRecvLines.push(line);
      }

      lastSavedLogIdRef.current = live.logs[live.logs.length - 1]?.id ?? lastSavedLogIdRef.current;
      if (pendingRecvLines.length > 0) {
        appendLine(pendingRecvLines.join(''));
      }
    };

    const timer = setInterval(flushToFile, FILE_FLUSH_INTERVAL);
    return () => {
      clearInterval(timer);
      flushToFile();
    };
  }, [sessionId, appendLine]);

  return { fileHandleRef, lastSavedLogIdRef, appendLine };
}

/**
 * Prompt user to pick a save file via File System Access API.
 * Returns the handle or null if cancelled.
 */
export async function pickSaveFile(suggestedName: string): Promise<FileSystemFileHandle | null> {
  try {
    // @ts-expect-error – File System Access API not in TS lib yet
    return await window.showSaveFilePicker({
      suggestedName,
      types: [{ description: 'Text', accept: { 'text/plain': ['.txt'] } }],
    });
  } catch {
    return null;
  }
}

/**
 * Export content via File System Access API, falling back to blob download.
 */
export async function exportToFile(
  content: string,
  fileName: string,
  options?: {
    mimeType?: string;
    description?: string;
    extensions?: string[];
  },
): Promise<{ ok: boolean; via: 'picker' | 'download' | null }> {
  const mimeType = options?.mimeType ?? 'text/plain';
  const description = options?.description ?? 'Text';
  const extensions = options?.extensions ?? ['.txt'];
  const accept: Record<string, string[]> = {};
  for (const ext of extensions) {
    accept[mimeType] = [...(accept[mimeType] ?? []), ext];
  }

  const showSaveFilePicker = (window as unknown as {
    showSaveFilePicker?: (opts: {
      suggestedName?: string;
      types?: Array<{ description?: string; accept: Record<string, string[]> }>;
    }) => Promise<FileSystemFileHandle>;
  }).showSaveFilePicker;

  if (typeof showSaveFilePicker === 'function') {
    try {
      const handle = await showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description, accept }],
      });
      const writer = await handle.createWritable();
      await writer.write(content);
      await writer.close();
      return { ok: true, via: 'picker' };
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { ok: false, via: null };
      }
    }
  }

  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    return { ok: true, via: 'download' };
  } catch {
    return { ok: false, via: null };
  }
}
