import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  Session, ConnectionConfig, ReceiveSettings, SendSettings,
  LogEntry, ProtocolType, TrafficSample, QuickCommand,
} from '../types';

const TRAFFIC_MAX  = 60;
const HISTORY_MAX  = 30;
const LOGS_CAP     = 100_000;
const LOGS_TRIM    = 10_000;

let _logId = 0;
const nextLogId = () => ++_logId;

// Use timestamp+random so IDs are unique across rehydration cycles
const newSessionId = () => `sess_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
const newCmdId     = () => `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;

function defaultConfig(): ConnectionConfig {
  return {
    protocol: 'TCP_CLIENT',
    remoteHost: '127.0.0.1', remotePort: 8080,
    localPort: 8080, localHost: '0.0.0.0',
    wsUrl: 'ws://127.0.0.1:8080',
    serialPort: '', baudRate: 115200,
    dataBits: 8, stopBits: 1, parity: 'none',
  };
}
function defaultReceive(): ReceiveSettings {
  return { encoding: 'ASCII', showAsLog: true, autoNewline: true, saveToFile: false, pauseReceiving: false };
}
function defaultSend(): SendSettings {
  return { encoding: 'ASCII', autoParseEscapes: true, autoCRLF: true, autoChecksum: false, checksumType: 'CRC16', periodicEnabled: false, periodicInterval: 1000 };
}
function makeSession(protocol: ProtocolType = 'TCP_CLIENT'): Session {
  const id  = newSessionId();
  const cfg = defaultConfig();
  cfg.protocol = protocol;
  return {
    id, name: `${protocol.replace('_', ' ')}`,
    config: cfg, status: 'idle', statusMsg: '',
    receiveSettings: defaultReceive(), sendSettings: defaultSend(),
    logs: [], rxBytes: 0, txBytes: 0,
    trafficSamples: [], sendHistory: [],
  };
}

type PersistedState = {
  sessions: Array<Omit<Session, 'logs' | 'trafficSamples' | 'rxBytes' | 'txBytes'>
    & { logs: []; trafficSamples: []; rxBytes: 0; txBytes: 0 }>;
  activeSessionId: string | null;
  quickCommands: QuickCommand[];
};

interface AppState {
  sessions: Session[];
  activeSessionId: string | null;
  logFilter: string;
  quickCommands: QuickCommand[];

  addSession: (protocol?: ProtocolType) => void;
  removeSession: (id: string) => void;
  setActiveSession: (id: string) => void;

  updateConfig: (id: string, patch: Partial<ConnectionConfig>) => void;
  updateReceiveSettings: (id: string, patch: Partial<ReceiveSettings>) => void;
  updateSendSettings: (id: string, patch: Partial<SendSettings>) => void;

  setStatus: (id: string, status: Session['status'], msg?: string, remoteAddr?: string) => void;
  appendLog: (id: string, entry: Omit<LogEntry, 'id'>) => void;
  appendLogs: (id: string, entries: Omit<LogEntry, 'id'>[]) => void;
  clearLogs: (id: string) => void;

  addRxBytes: (id: string, n: number) => void;
  addTxBytes: (id: string, n: number) => void;
  resetCounts: (id: string) => void;
  addTrafficSample: (id: string, sample: TrafficSample) => void;

  addSendHistory: (id: string, text: string) => void;

  addQuickCommand: (cmd: Omit<QuickCommand, 'id'>) => void;
  removeQuickCommand: (id: string) => void;
  updateQuickCommand: (id: string, patch: Partial<Omit<QuickCommand, 'id'>>) => void;

  setLogFilter: (filter: string) => void;
}

const find = (sessions: Session[], id: string) => sessions.find(s => s.id === id);

export const useAppStore = create<AppState>()(
  persist(
    immer((set) => ({
      sessions: [makeSession('TCP_CLIENT')],
      activeSessionId: null,
      logFilter: '',
      quickCommands: [],

      addSession: (protocol = 'TCP_CLIENT') =>
        set(s => { const ss = makeSession(protocol); s.sessions.push(ss); s.activeSessionId = ss.id; }),

      removeSession: (id) =>
        set(s => {
          const idx = s.sessions.findIndex((ss: Session) => ss.id === id);
          if (idx === -1) return;
          s.sessions.splice(idx, 1);
          if (s.activeSessionId === id)
            s.activeSessionId = s.sessions.length > 0 ? s.sessions[Math.max(0, idx - 1)].id : null;
        }),

      setActiveSession: (id) => set(s => { s.activeSessionId = id; }),

      updateConfig: (id, patch) =>
        set(s => { const ss = find(s.sessions, id); if (ss) Object.assign(ss.config, patch); }),

      updateReceiveSettings: (id, patch) =>
        set(s => { const ss = find(s.sessions, id); if (ss) Object.assign(ss.receiveSettings, patch); }),

      updateSendSettings: (id, patch) =>
        set(s => { const ss = find(s.sessions, id); if (ss) Object.assign(ss.sendSettings, patch); }),

      setStatus: (id, status, msg = '', remoteAddr) =>
        set(s => {
          const ss = find(s.sessions, id);
          if (!ss) return;
          ss.status = status; ss.statusMsg = msg;
          if (remoteAddr !== undefined) ss.remoteAddr = remoteAddr;
        }),

      appendLog: (id, entry) =>
        set(s => {
          const ss = find(s.sessions, id);
          if (!ss) return;
          if (ss.receiveSettings.pauseReceiving && entry.direction === 'recv') return;
          ss.logs.push({ ...entry, id: nextLogId() });
          if (ss.logs.length > LOGS_CAP) ss.logs.splice(0, LOGS_TRIM);
        }),

      /**
       * Batch version of appendLog — a single Zustand set call for N entries.
       * Use this for high-throughput ingestion (100ms flush buckets).
       */
      appendLogs: (id: string, entries: Omit<LogEntry, 'id'>[]) =>
        set(s => {
          const ss = find(s.sessions, id);
          if (!ss || entries.length === 0) return;
          const paused = ss.receiveSettings.pauseReceiving;
          for (const e of entries) {
            if (paused && e.direction === 'recv') continue;
            ss.logs.push({ ...e, id: nextLogId() });
          }
          if (ss.logs.length > LOGS_CAP) ss.logs.splice(0, ss.logs.length - (LOGS_CAP - LOGS_TRIM));
        }),

      clearLogs: (id) =>
        set(s => { const ss = find(s.sessions, id); if (ss) ss.logs = []; }),

      addRxBytes: (id, n) =>
        set(s => { const ss = find(s.sessions, id); if (ss) ss.rxBytes += n; }),

      addTxBytes: (id, n) =>
        set(s => { const ss = find(s.sessions, id); if (ss) ss.txBytes += n; }),

      resetCounts: (id) =>
        set(s => {
          const ss = find(s.sessions, id);
          if (ss) { ss.rxBytes = 0; ss.txBytes = 0; ss.trafficSamples = []; }
        }),

      addTrafficSample: (id, sample) =>
        set(s => {
          const ss = find(s.sessions, id);
          if (!ss) return;
          ss.trafficSamples.push(sample);
          if (ss.trafficSamples.length > TRAFFIC_MAX)
            ss.trafficSamples.splice(0, ss.trafficSamples.length - TRAFFIC_MAX);
        }),

      addSendHistory: (id, text) =>
        set(s => {
          const ss = find(s.sessions, id);
          if (!ss || !text.trim()) return;
          // deduplicate + put latest at front
          ss.sendHistory = [text, ...ss.sendHistory.filter(t => t !== text)].slice(0, HISTORY_MAX);
        }),

      addQuickCommand: (cmd) =>
        set(s => { s.quickCommands.push({ ...cmd, id: newCmdId() }); }),

      removeQuickCommand: (id) =>
        set(s => { s.quickCommands = s.quickCommands.filter((c: QuickCommand) => c.id !== id); }),

      updateQuickCommand: (id, patch) =>
        set(s => {
          const c = s.quickCommands.find((c: QuickCommand) => c.id === id);
          if (c) Object.assign(c, patch);
        }),

      setLogFilter: (filter) => set(s => { s.logFilter = filter; }),
    })),
    {
      name: 'fnd-store-v1',
      storage: createJSONStorage(() => localStorage),
      // Only persist config/settings, not ephemeral data
      partialize: (state): PersistedState => ({
        sessions: state.sessions.map(s => ({
          id: s.id, name: s.name,
          config: s.config,
          receiveSettings: s.receiveSettings,
          sendSettings: s.sendSettings,
          status: 'idle' as const, statusMsg: '',
          logs: [], rxBytes: 0, txBytes: 0,
          trafficSamples: [],
          sendHistory: s.sendHistory,
        })),
        activeSessionId: state.activeSessionId,
        quickCommands: state.quickCommands,
      }),
    }
  )
);

export const getActiveSession = (state: AppState) =>
  state.sessions.find((s: Session) => s.id === state.activeSessionId)
    ?? state.sessions[0]
    ?? null;
