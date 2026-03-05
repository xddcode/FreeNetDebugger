import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useAppStore } from './store';
import type { ConnectionStatus, TauriDataEvent, TauriStatusEvent, LogEntry } from './types';
import AppLayout from './components/layout/AppLayout';

/** Maps raw Tauri status strings → our ConnectionStatus enum */
function mapStatus(raw: string): ConnectionStatus {
  const m: Record<string, ConnectionStatus> = {
    idle: 'idle', connecting: 'connecting', connected: 'connected',
    listening: 'listening', error: 'error', disconnected: 'idle',
    disconnecting: 'disconnecting',
    client_connected: 'listening',
    client_disconnected: 'listening',
  };
  return m[raw] ?? 'idle';
}

function statusLogText(raw: string, message: string): string | null {
  switch (raw) {
    case 'connected':           return `Connected to ${message}`;
    case 'listening':           return `Listening on ${message}`;
    case 'error':               return `Error: ${message}`;
    case 'disconnected':        return message || 'Disconnected';
    case 'client_connected':    return `Client connected: ${message}`;
    case 'client_disconnected': return `Client disconnected: ${message}`;
    default:                    return null;
  }
}

export default function App() {
  const setStatus        = useAppStore(s => s.setStatus);
  const appendLog        = useAppStore(s => s.appendLog);
  const appendLogs       = useAppStore(s => s.appendLogs);
  const addRxBytes       = useAppStore(s => s.addRxBytes);
  const addTxBytes       = useAppStore(s => s.addTxBytes);
  const addTrafficSample = useAppStore(s => s.addTrafficSample);
  const setActiveSession = useAppStore(s => s.setActiveSession);

  /**
   * High-throughput data buffer.
   * Incoming 'net:data' events are collected here and flushed to Zustand
   * every FLUSH_INTERVAL_MS — decoupling the packet arrival rate from the
   * React render rate and keeping the UI smooth even at 100 MB/s.
   */
  const FLUSH_INTERVAL_MS = 80;
  const pendingLogs  = useRef<Map<string, Omit<LogEntry, 'id'>[]>>(new Map());
  const pendingRx    = useRef<Map<string, number>>(new Map());
  const pendingTx    = useRef<Map<string, number>>(new Map());

  // Init active session
  useEffect(() => {
    const store = useAppStore.getState();
    if (!store.activeSessionId && store.sessions.length > 0) {
      setActiveSession(store.sessions[0].id);
    }
  }, [setActiveSession]);

  useEffect(() => {
    const unlistenData = listen<TauriDataEvent>('net:data', (ev) => {
      const { connection_id, direction, data, source, timestamp } = ev.payload;

      // O(1) append — no Zustand/React involvement
      if (!pendingLogs.current.has(connection_id)) {
        pendingLogs.current.set(connection_id, []);
      }
      const arr = pendingLogs.current.get(connection_id);
      if (arr) {
        arr.push({ timestamp, direction, data, source });
      }

      if (direction === 'recv') {
        pendingRx.current.set(
          connection_id,
          (pendingRx.current.get(connection_id) ?? 0) + data.length,
        );
      } else if (direction === 'send') {
        pendingTx.current.set(
          connection_id,
          (pendingTx.current.get(connection_id) ?? 0) + data.length,
        );
      }
    });

    return () => { unlistenData.then(f => f()); };
  }, []);

  useEffect(() => {
    const unlistenStatus = listen<TauriStatusEvent>('net:status', (ev) => {
      const { connection_id, status, message } = ev.payload;
      const mapped = mapStatus(status);
      const remAddr = status === 'connected' ? message : undefined;
      setStatus(connection_id, mapped, message, remAddr);

      const logText = statusLogText(status, message);
      if (logText) {
        appendLog(connection_id, {
          timestamp: Date.now(),
          direction: 'system',
          data: Array.from(new TextEncoder().encode(logText)),
        });
      }
    });

    return () => { unlistenStatus.then(f => f()); };
  }, [appendLog, setStatus]);

  useEffect(() => {
    const flush = () => {
      if (pendingLogs.current.size === 0 && pendingRx.current.size === 0 && pendingTx.current.size === 0) {
        return;
      }

      // Drain buffers atomically
      const logsSnap = pendingLogs.current;
      const rxSnap   = pendingRx.current;
      const txSnap   = pendingTx.current;
      pendingLogs.current = new Map();
      pendingRx.current   = new Map();
      pendingTx.current   = new Map();

      // Single Zustand update per session (not per packet)
      for (const [id, entries] of logsSnap) {
        if (entries.length > 0) {
          appendLogs(id, entries);
        }
      }
      for (const [id, bytes] of rxSnap) {
        if (bytes > 0) {
          addRxBytes(id, bytes);
        }
      }
      for (const [id, bytes] of txSnap) {
        if (bytes > 0) {
          addTxBytes(id, bytes);
        }
      }
    };

    const timer = setInterval(flush, FLUSH_INTERVAL_MS);
    return () => { clearInterval(timer); flush(); }; // flush on unmount
  }, [appendLogs, addRxBytes, addTxBytes]);

  const prevBytesRef = useRef<Map<string, { rx: number; tx: number }>>(new Map());

  useEffect(() => {
    const timer = setInterval(() => {
      const sessions = useAppStore.getState().sessions;
      const now = Date.now();
      for (const sess of sessions) {
        const prev = prevBytesRef.current.get(sess.id) ?? { rx: 0, tx: 0 };
        addTrafficSample(sess.id, {
          ts: now,
          rxRate:  Math.max(0, sess.rxBytes - prev.rx),
          txRate:  Math.max(0, sess.txBytes - prev.tx),
          rxTotal: sess.rxBytes,
          txTotal: sess.txBytes,
        });
        prevBytesRef.current.set(sess.id, { rx: sess.rxBytes, tx: sess.txBytes });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [addTrafficSample]);

  return <AppLayout />;
}
