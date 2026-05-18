import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { getCachedItem, setCachedItem, removeCachedItem } from './storage';
import type {
  Session, ConnectionConfig, ReceiveSettings, SendSettings,
  LogEntry, ProtocolType, TrafficSample, SessionProfile,
} from '../types';
import {
  TRAFFIC_MAX_SAMPLES, SEND_HISTORY_MAX, LOGS_CAP, LOGS_TRIM,
  STORAGE_KEY, SESSION_PROFILE_KEY, SESSION_PROFILES_MAX,
} from '../config/constants';

let _logIdCounter = 0;
const nextLogId = () => Date.now() * 1000 + ((_logIdCounter++) % 1000);

const newSessionId = () => `sess_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;

function defaultConfig(): ConnectionConfig {
  return {
    protocol: 'TCP_CLIENT',
    remoteHost: '127.0.0.1', remotePort: 8080,
    localPort: 8080, localHost: '0.0.0.0',
    wsUrl: 'ws://127.0.0.1:8080',
    serialPort: '', baudRate: 115200,
    dataBits: 8, stopBits: 1, parity: 'none',
    httpUrl: 'https://httpbin.org/get',
    httpMethod: 'GET',
    httpHeaders: [],
    httpBody: '',
  };
}
function defaultReceive(): ReceiveSettings {
  return { encoding: 'AUTO', asciiNonPrintable: 'DOT', showAsLog: true, autoNewline: true, saveToFile: false, pauseReceiving: false };
}
function defaultSend(): SendSettings {
  return { encoding: 'ASCII', autoParseEscapes: true, autoCRLF: true, autoChecksum: false, checksumType: 'CRC16', periodicEnabled: false, periodicInterval: 1000 };
}
export function makeSession(protocol: ProtocolType = 'TCP_CLIENT'): Session {
  const id  = newSessionId();
  const cfg = defaultConfig();
  cfg.protocol = protocol;
  return {
    id, name: `${protocol.replace('_', ' ')}`,
    config: cfg, status: 'idle', statusMsg: '',
    receiveSettings: defaultReceive(), sendSettings: defaultSend(),
    logs: [], rxBytes: 0, txBytes: 0,
    trafficSamples: [], sendHistory: [], sendContent: '',
  };
}

type PersistedSessionState = {
  sessions: Array<Omit<Session, 'logs' | 'trafficSamples' | 'rxBytes' | 'txBytes'>
    & { logs: []; trafficSamples: []; rxBytes: 0; txBytes: 0 }>;
  activeSessionId: string | null;
};

interface SessionState {
  sessions: Session[];
  activeSessionId: string | null;

  addSession: (protocol?: ProtocolType) => void;
  removeSession: (id: string) => void;
  setActiveSession: (id: string) => void;

  updateConfig: (id: string, patch: Partial<ConnectionConfig>) => void;
  updateReceiveSettings: (id: string, patch: Partial<ReceiveSettings>) => void;
  updateSendSettings: (id: string, patch: Partial<SendSettings>) => void;
  updateSendContent: (id: string, content: string) => void;

  setStatus: (id: string, status: Session['status'], msg?: string, remoteAddr?: string) => void;
  appendLog: (id: string, entry: Omit<LogEntry, 'id'>) => void;
  appendLogs: (id: string, entries: Omit<LogEntry, 'id'>[]) => void;
  clearLogs: (id: string) => void;

  addRxBytes: (id: string, n: number) => void;
  addTxBytes: (id: string, n: number) => void;
  resetCounts: (id: string) => void;
  addTrafficSample: (id: string, sample: TrafficSample) => void;

  addSendHistory: (id: string, text: string) => void;
  removeSendHistory: (id: string, text: string) => void;
  clearSendHistory: (id: string) => void;

  // Session profiles
  profiles: SessionProfile[];
  saveProfile: (fromSessionId: string, name?: string) => SessionProfile | null;
  deleteProfile: (profileId: string) => void;
  applyProfile: (profileId: string, toSessionId: string) => boolean;
  renameProfile: (profileId: string, name: string) => void;
}

const find = (sessions: Session[], id: string) => sessions.find(s => s.id === id);

function loadProfiles(): SessionProfile[] {
  try {
    const raw = localStorage.getItem(SESSION_PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SessionProfile[];
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore parse errors
  }
  return [];
}

function saveProfiles(profiles: SessionProfile[]) {
  try {
    localStorage.setItem(SESSION_PROFILE_KEY, JSON.stringify(profiles));
  } catch {
    // ignore storage errors
  }
}

export const useSessionStore = create<SessionState>()(
  persist(
    immer((set) => ({
      sessions: [makeSession('TCP_CLIENT')],
      activeSessionId: null,
      profiles: loadProfiles(),

      addSession: (protocol = 'TCP_CLIENT') =>
        set(s => { const ss = makeSession(protocol); s.sessions.push(ss); s.activeSessionId = ss.id; }),

      removeSession: (id) =>
        set(s => {
          const idx = s.sessions.findIndex((ss: Session) => ss.id === id);
          if (idx === -1) {return;}
          s.sessions.splice(idx, 1);
          if (s.activeSessionId === id) {
            s.activeSessionId = s.sessions.length > 0 ? s.sessions[Math.max(0, idx - 1)].id : null;
          }
        }),

      setActiveSession: (id) => set(s => { s.activeSessionId = id; }),

      updateConfig: (id, patch) =>
        set(s => { const ss = find(s.sessions, id); if (ss) {Object.assign(ss.config, patch);} }),

      updateReceiveSettings: (id, patch) =>
        set(s => { const ss = find(s.sessions, id); if (ss) {Object.assign(ss.receiveSettings, patch);} }),

      updateSendSettings: (id, patch) =>
        set(s => { const ss = find(s.sessions, id); if (ss) {Object.assign(ss.sendSettings, patch);} }),

      updateSendContent: (id, content) =>
        set(s => { const ss = find(s.sessions, id); if (ss) {ss.sendContent = content;} }),

      setStatus: (id, status, msg = '', remoteAddr) =>
        set(s => {
          const ss = find(s.sessions, id);
          if (!ss) {return;}
          ss.status = status; ss.statusMsg = msg;
          if (remoteAddr !== undefined) {ss.remoteAddr = remoteAddr;}
        }),

      appendLog: (id, entry) =>
        set(s => {
          const ss = find(s.sessions, id);
          if (!ss) {return;}
          if (ss.receiveSettings.pauseReceiving && entry.direction === 'recv') {return;}
          ss.logs.push({ ...entry, id: nextLogId() });
          if (ss.logs.length > LOGS_CAP) {
            ss.logs.splice(0, LOGS_TRIM);
          }
        }),

      appendLogs: (id, entries) =>
        set(s => {
          const ss = find(s.sessions, id);
          if (!ss || entries.length === 0) {return;}
          const paused = ss.receiveSettings.pauseReceiving;
          for (const e of entries) {
            if (paused && e.direction === 'recv') {continue;}
            ss.logs.push({ ...e, id: nextLogId() });
          }
          if (ss.logs.length > LOGS_CAP) {
            ss.logs.splice(0, ss.logs.length - (LOGS_CAP - LOGS_TRIM));
          }
        }),

      clearLogs: (id) =>
        set(s => { const ss = find(s.sessions, id); if (ss) {ss.logs = [];} }),

      addRxBytes: (id, n) =>
        set(s => { const ss = find(s.sessions, id); if (ss) {ss.rxBytes += n;} }),

      addTxBytes: (id, n) =>
        set(s => { const ss = find(s.sessions, id); if (ss) {ss.txBytes += n;} }),

      resetCounts: (id) =>
        set(s => {
          const ss = find(s.sessions, id);
          if (ss) { ss.rxBytes = 0; ss.txBytes = 0; ss.trafficSamples = []; }
        }),

      addTrafficSample: (id, sample) =>
        set(s => {
          const ss = find(s.sessions, id);
          if (!ss) {return;}
          ss.trafficSamples.push(sample);
          if (ss.trafficSamples.length > TRAFFIC_MAX_SAMPLES) {
            ss.trafficSamples.splice(0, ss.trafficSamples.length - TRAFFIC_MAX_SAMPLES);
          }
        }),

      addSendHistory: (id, text) =>
        set(s => {
          const ss = find(s.sessions, id);
          const normalized = text.trim();
          if (!ss || !normalized) {return;}
          if (ss.sendHistory.includes(normalized)) {return;}
          ss.sendHistory = [normalized, ...ss.sendHistory].slice(0, SEND_HISTORY_MAX);
        }),

      removeSendHistory: (id, text) =>
        set(s => {
          const ss = find(s.sessions, id);
          if (!ss) {return;}
          ss.sendHistory = ss.sendHistory.filter(t => t !== text);
        }),

      clearSendHistory: (id) =>
        set(s => {
          const ss = find(s.sessions, id);
          if (!ss) {return;}
          ss.sendHistory = [];
        }),

      saveProfile: (fromSessionId, name) => {
        let result: SessionProfile | null = null;
        set(s => {
          const ss = find(s.sessions, fromSessionId);
          if (!ss) {return;}
          const profile: SessionProfile = {
            id: `prof_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            name: name?.trim() || ss.name || `${ss.config.protocol} Profile`,
            config: { ...ss.config },
            receiveSettings: { ...ss.receiveSettings },
            sendSettings: { ...ss.sendSettings },
            createdAt: Date.now(),
          };
          s.profiles = [profile, ...s.profiles].slice(0, SESSION_PROFILES_MAX);
          saveProfiles(s.profiles);
          result = profile;
        });
        return result;
      },

      deleteProfile: (profileId) =>
        set(s => {
          s.profiles = s.profiles.filter(p => p.id !== profileId);
          saveProfiles(s.profiles);
        }),

      applyProfile: (profileId, toSessionId) => {
        let ok = false;
        set(s => {
          const profile = s.profiles.find(p => p.id === profileId);
          const ss = find(s.sessions, toSessionId);
          if (!profile || !ss) {return;}
          ss.config = { ...profile.config };
          ss.receiveSettings = { ...profile.receiveSettings };
          ss.sendSettings = { ...profile.sendSettings };
          ok = true;
        });
        return ok;
      },

      renameProfile: (profileId, name) =>
        set(s => {
          const p = s.profiles.find(pr => pr.id === profileId);
          if (p) {
            p.name = name.trim() || p.name;
            saveProfiles(s.profiles);
          }
        }),
    })),
    {
      name: `${STORAGE_KEY}-sessions`,
      storage: createJSONStorage(() => ({
        getItem: (name) => getCachedItem(name),
        setItem: (name, value) => setCachedItem(name, value),
        removeItem: (name) => removeCachedItem(name),
      })),
      migrate: (persisted: unknown) => {
        const p = persisted as PersistedSessionState | undefined;
        if (p?.sessions) {
          for (const s of p.sessions) {
            if ((s as { sendContent?: string }).sendContent === undefined) {
              (s as { sendContent: string }).sendContent = '';
            }
            const cfg = s.config as { httpUrl?: string; httpMethod?: string; httpHeaders?: unknown; httpBody?: string };
            if (cfg.httpUrl === undefined) { cfg.httpUrl = 'https://httpbin.org/get'; }
            if (cfg.httpMethod === undefined) { cfg.httpMethod = 'GET'; }
            if (cfg.httpHeaders === undefined) { cfg.httpHeaders = []; }
            if (cfg.httpBody === undefined) { cfg.httpBody = ''; }
          }
        }
        return p ?? persisted;
      },
      partialize: (state): PersistedSessionState => ({
        sessions: state.sessions.map(s => ({
          id: s.id, name: s.name,
          config: s.config,
          receiveSettings: { ...s.receiveSettings, saveToFile: false },
          sendSettings: s.sendSettings,
          status: 'idle' as const, statusMsg: '',
          logs: [], rxBytes: 0, txBytes: 0,
          trafficSamples: [],
          sendHistory: s.sendHistory,
          sendContent: s.sendContent,
        })),
        activeSessionId: state.activeSessionId,
      }),
    }
  )
);

export const getActiveSession = (state: SessionState) =>
  state.sessions.find((s: Session) => s.id === state.activeSessionId)
    ?? state.sessions[0]
    ?? null;
