import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { getCachedItem, setCachedItem, removeCachedItem, flushDeferred } from './storage';
import {
  isGroup, isSession,
  type Session, type GroupNode, type SessionItem, type WorkspaceItem,
  type ConnectionConfig, type ReceiveSettings, type SendSettings,
  type LogEntry, type ProtocolType, type TrafficSample, type TabDraft,
} from '../types';
import {
  TRAFFIC_MAX_SAMPLES, SEND_HISTORY_MAX, LOGS_CAP, LOGS_TRIM,
  STORAGE_KEY,
} from '../config/constants';

let _logIdCounter = 0;
const nextLogId = () => Date.now() * 1000 + ((_logIdCounter++) % 1000);

const newSessionId = () => `sess_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
const newGroupId = () => `grp_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;

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
    httpParams: [],
    httpBody: { type: 'none' } as const,
  };
}
function defaultReceive(): ReceiveSettings {
  return { encoding: 'AUTO', asciiNonPrintable: 'DOT', autoNewline: true, saveToFile: false, pauseReceiving: false };
}
function defaultSend(): SendSettings {
  return { encoding: 'ASCII', autoParseEscapes: true, autoCRLF: true, autoChecksum: false, checksumType: 'CRC16', periodicEnabled: false, periodicInterval: 1000 };
}

export function makeSession(protocol: ProtocolType = 'TCP_CLIENT', name?: string): SessionItem {
  const id  = newSessionId();
  const cfg = defaultConfig();
  cfg.protocol = protocol;
  return {
    kind: 'session',
    id, name: name?.trim() || `${protocol.replace('_', ' ')}`,
    config: cfg, status: 'idle', statusMsg: '',
    receiveSettings: defaultReceive(), sendSettings: defaultSend(),
    logs: [], rxBytes: 0, txBytes: 0,
    trafficSamples: [], clients: [], sendHistory: [], sendContent: '',
    opened: true,
  };
}

/** Plain-data clone — safe inside Immer producers (structuredClone breaks on drafts). */
function cloneConnectionConfig(config: ConnectionConfig): ConnectionConfig {
  return JSON.parse(JSON.stringify(config)) as ConnectionConfig;
}

function cloneDraftFromSession(sess: SessionItem): TabDraft {
  return {
    name: sess.name,
    config: cloneConnectionConfig(sess.config),
    receiveSettings: { ...sess.receiveSettings },
    sendSettings: { ...sess.sendSettings },
    sendContent: sess.sendContent,
    sendHistory: [...sess.sendHistory],
    dirty: false,
  };
}

function applyDraftToSession(sess: SessionItem, draft: TabDraft): void {
  sess.name = draft.name;
  sess.config = cloneConnectionConfig(draft.config);
  sess.receiveSettings = { ...draft.receiveSettings };
  sess.sendSettings = { ...draft.sendSettings };
  sess.sendContent = draft.sendContent;
  sess.sendHistory = [...draft.sendHistory];
}

type KvRow = { key: string; value: string; enabled: boolean };

/** Bruno-style trailing empty row — UI normalizes this; exclude from dirty when unchanged. */
function ensureTrailingKvRow<T extends KvRow>(rows: T[]): T[] {
  const last = rows[rows.length - 1];
  if (!last || last.key.trim() !== '') {
    return [...rows, { key: '', value: '', enabled: true } as T];
  }
  return rows;
}

function normalizeHttpConfig(config: ConnectionConfig): ConnectionConfig {
  if (config.protocol !== 'HTTP') {
    return config;
  }
  const c = cloneConnectionConfig(config);
  c.httpHeaders = ensureTrailingKvRow(c.httpHeaders ?? []);
  c.httpParams = ensureTrailingKvRow(c.httpParams ?? []);
  return c;
}

function editableFingerprint(draft: TabDraft): string {
  return JSON.stringify({
    name: draft.name,
    config: normalizeHttpConfig(cloneConnectionConfig(draft.config)),
    receiveSettings: draft.receiveSettings,
    sendSettings: draft.sendSettings,
    sendContent: draft.sendContent,
    sendHistory: draft.sendHistory,
  });
}

/** True only when tab edits differ from the sidebar catalog session. */
function recomputeTabDraftDirty(s: SessionViewState, sessionId: string): void {
  const sess = findSession(s.rootChildren, sessionId);
  const draft = s.tabDrafts[sessionId];
  if (!sess || !draft) { return; }
  const catalog = cloneDraftFromSession(sess);
  draft.dirty = editableFingerprint(draft) !== editableFingerprint(catalog);
}

/** View model for UI bound to an open tab (catalog session + tab draft). */
export function mergeSessionWithDraft(sess: SessionItem, draft: TabDraft): Session {
  return {
    ...sess,
    name: draft.name,
    config: draft.config,
    receiveSettings: draft.receiveSettings,
    sendSettings: draft.sendSettings,
    sendContent: draft.sendContent,
    sendHistory: draft.sendHistory,
  };
}

function ensureDraftOnState(s: SessionViewState, id: string): TabDraft | null {
  const sess = findSession(s.rootChildren, id);
  if (!sess || !sess.opened) { return null; }
  if (!s.tabDrafts[id]) {
    s.tabDrafts[id] = cloneDraftFromSession(sess);
  }
  return s.tabDrafts[id];
}

export function makeGroup(name?: string): GroupNode {
  return {
    kind: 'group',
    id: newGroupId(),
    name: name?.trim() || 'Untitled group',
    expanded: true,
    children: [],
  };
}

// ─────────────────────────────────────────────────────────────
// Tree helpers — pure, immer-friendly (operate on draft state).
// ─────────────────────────────────────────────────────────────

/** Depth-first iteration over every session in the tree. */
function* iterSessions(items: WorkspaceItem[]): Generator<SessionItem> {
  for (const it of items) {
    if (isSession(it)) {
      yield it;
    } else {
      yield* iterSessions(it.children);
    }
  }
}

/** Depth-first iteration over every group in the tree. */
function* iterGroups(items: WorkspaceItem[]): Generator<GroupNode> {
  for (const it of items) {
    if (isGroup(it)) {
      yield it;
      yield* iterGroups(it.children);
    }
  }
}

function findSession(items: WorkspaceItem[], id: string): SessionItem | null {
  for (const s of iterSessions(items)) {
    if (s.id === id) { return s; }
  }
  return null;
}

function findGroup(items: WorkspaceItem[], id: string): GroupNode | null {
  for (const g of iterGroups(items)) {
    if (g.id === id) { return g; }
  }
  return null;
}

/** Locates the array a session belongs to, plus its index inside it. */
function findSessionParent(
  items: WorkspaceItem[],
  id: string,
): { parent: WorkspaceItem[]; index: number } | null {
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (isSession(it) && it.id === id) {
      return { parent: items, index: i };
    }
    if (isGroup(it)) {
      const inner = findSessionParent(it.children, id);
      if (inner) { return inner; }
    }
  }
  return null;
}

function findGroupParent(
  items: WorkspaceItem[],
  id: string,
): { parent: WorkspaceItem[]; index: number } | null {
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (isGroup(it)) {
      if (it.id === id) {
        return { parent: items, index: i };
      }
      const inner = findGroupParent(it.children, id);
      if (inner) { return inner; }
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Persistence shape
// ─────────────────────────────────────────────────────────────

type PersistedWorkspaceItem =
  | {
      kind: 'group';
      id: string;
      name: string;
      expanded: boolean;
      children: PersistedWorkspaceItem[];
    }
  | (Omit<Session, 'logs' | 'trafficSamples' | 'rxBytes' | 'txBytes'> & {
      kind: 'session';
      logs: []; trafficSamples: []; rxBytes: 0; txBytes: 0;
    });

interface PersistedSessionState {
  rootChildren: PersistedWorkspaceItem[];
  activeSessionId: string | null;
}

// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────

interface SessionCore {
  rootChildren: WorkspaceItem[];
  /** Open-tab working copies; keyed by session id. Not persisted. */
  tabDrafts: Record<string, TabDraft>;
  /** Single, global "currently focused" session — independent of where it lives in the tree. */
  activeSessionId: string | null;
}

/** Slice passed to selectors from React components. */
export type SessionViewState = SessionCore;

interface SessionState extends SessionCore {
  // ───── group CRUD ─────
  /** Creates a group. `parentGroupId === null` (or undefined) drops it at the root. */
  addGroup: (name?: string, parentGroupId?: string | null) => string;
  removeGroup: (id: string) => void;
  renameGroup: (id: string, name: string) => void;
  toggleGroupExpanded: (id: string) => void;

  // ───── session CRUD ─────
  /** Creates a session under `parentGroupId`. Pass `null`/omit to drop it at the root. */
  addSession: (protocol?: ProtocolType, name?: string, parentGroupId?: string | null) => void;
  /** Hard delete — removes the session from the tree. Call from the sidebar, not from a tab close. */
  removeSession: (id: string) => void;
  /**
   * Closes the session's tab without deleting the underlying session.
   * The session stays in the sidebar, and re-opens when selected again.
   */
  closeSessionTab: (id: string) => void;
  /** Marks the session as the globally active one AND opens its tab if it was closed. */
  setActiveSession: (id: string) => void;

  // ───── per-session edits ─────
  updateConfig: (id: string, patch: Partial<ConnectionConfig>) => void;
  updateReceiveSettings: (id: string, patch: Partial<ReceiveSettings>) => void;
  updateSendSettings: (id: string, patch: Partial<SendSettings>) => void;
  updateSendContent: (id: string, content: string) => void;
  /** Sidebar / catalog rename — updates the persisted session immediately. */
  renameSession: (id: string, name: string) => void;
  /** Tab rename — only affects the open tab until the user saves. */
  renameSessionDraft: (id: string, name: string) => void;

  // ───── runtime ─────
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

  addClient: (id: string, clientAddr: string) => void;
  removeClient: (id: string, clientAddr: string) => void;

  // ───── persistence ─────
  /** Commits one tab draft to its catalog session. */
  saveSession: (id: string) => void;
  /** Commits every dirty tab draft and flushes deferred storage. */
  saveAll: () => Promise<void>;
  /** Drops unsaved tab edits (re-reads from catalog sessions). */
  discardAllUnsavedDrafts: () => void;
  /** Drops unsaved edits for a single tab. */
  revertTabDraft: (id: string) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    immer((set) => {
      const defaultSession = makeSession('TCP_CLIENT');

      return {
        rootChildren: [defaultSession],
        tabDrafts: { [defaultSession.id]: cloneDraftFromSession(defaultSession) },
        activeSessionId: defaultSession.id,

        // ───── group CRUD ─────
        addGroup: (name, parentGroupId) => {
          const g = makeGroup(name);
          set((s) => {
            if (parentGroupId) {
              const parent = findGroup(s.rootChildren, parentGroupId);
              if (parent) {
                parent.children.push(g);
                parent.expanded = true;
                return;
              }
            }
            s.rootChildren.push(g);
          });
          return g.id;
        },

        removeGroup: (id) =>
          set((s) => {
            const hit = findGroupParent(s.rootChildren, id);
            if (!hit) { return; }
            const removed = hit.parent[hit.index] as GroupNode;
            // If the active session lives inside the group being removed,
            // pick another opened session as the new active.
            if (s.activeSessionId) {
              const insideRemoved = findSession([removed], s.activeSessionId) !== null;
              if (insideRemoved) {
                hit.parent.splice(hit.index, 1);
                const nextOpen = [...iterSessions(s.rootChildren)].find((x) => x.opened);
                s.activeSessionId = nextOpen?.id ?? null;
                return;
              }
            }
            hit.parent.splice(hit.index, 1);
          }),

        renameGroup: (id, name) =>
          set((s) => {
            const g = findGroup(s.rootChildren, id);
            if (!g) { return; }
            const trimmed = name.trim();
            if (!trimmed || trimmed === g.name) { return; }
            g.name = trimmed;
          }),

        toggleGroupExpanded: (id) =>
          set((s) => {
            const g = findGroup(s.rootChildren, id);
            if (g) { g.expanded = !g.expanded; }
          }),

        // ───── session CRUD ─────
        addSession: (protocol = 'TCP_CLIENT', name, parentGroupId) =>
          set((s) => {
            const ss = makeSession(protocol, name);
            s.tabDrafts[ss.id] = cloneDraftFromSession(ss);
            if (parentGroupId) {
              const parent = findGroup(s.rootChildren, parentGroupId);
              if (parent) {
                parent.children.push(ss);
                parent.expanded = true;
                s.activeSessionId = ss.id;
                return;
              }
            }
            s.rootChildren.push(ss);
            s.activeSessionId = ss.id;
          }),

        removeSession: (id) =>
          set((s) => {
            const hit = findSessionParent(s.rootChildren, id);
            if (!hit) { return; }
            hit.parent.splice(hit.index, 1);
            delete s.tabDrafts[id];
            if (s.activeSessionId === id) {
              const nextOpen = [...iterSessions(s.rootChildren)].find((x) => x.opened);
              s.activeSessionId = nextOpen?.id ?? null;
            }
          }),

        closeSessionTab: (id) =>
          set((s) => {
            const sess = findSession(s.rootChildren, id);
            if (!sess) { return; }
            sess.opened = false;
            delete s.tabDrafts[id];
            if (s.activeSessionId === id) {
              const nextOpen = [...iterSessions(s.rootChildren)].find((x) => x.opened);
              s.activeSessionId = nextOpen?.id ?? null;
            }
          }),

        setActiveSession: (id) =>
          set((s) => {
            const sess = findSession(s.rootChildren, id);
            if (!sess) { return; }
            sess.opened = true;
            s.activeSessionId = id;
            ensureDraftOnState(s, id);
            recomputeTabDraftDirty(s, id);
          }),

        // ───── per-session edits ─────
        updateConfig: (id, patch) =>
          set((s) => {
            const draft = ensureDraftOnState(s, id);
            if (!draft) { return; }
            Object.assign(draft.config, patch);
            recomputeTabDraftDirty(s, id);
          }),

        updateReceiveSettings: (id, patch) =>
          set((s) => {
            const draft = ensureDraftOnState(s, id);
            if (!draft) { return; }
            Object.assign(draft.receiveSettings, patch);
            recomputeTabDraftDirty(s, id);
          }),

        updateSendSettings: (id, patch) =>
          set((s) => {
            const draft = ensureDraftOnState(s, id);
            if (!draft) { return; }
            Object.assign(draft.sendSettings, patch);
            recomputeTabDraftDirty(s, id);
          }),

        updateSendContent: (id, content) =>
          set((s) => {
            const draft = ensureDraftOnState(s, id);
            if (!draft) { return; }
            draft.sendContent = content;
            recomputeTabDraftDirty(s, id);
          }),

        renameSession: (id, name) =>
          set((s) => {
            const sess = findSession(s.rootChildren, id);
            if (!sess) { return; }
            const trimmed = name.trim();
            if (!trimmed || trimmed === sess.name) { return; }
            sess.name = trimmed;
            const draft = s.tabDrafts[id];
            if (draft) {
              draft.name = trimmed;
            }
          }),

        renameSessionDraft: (id, name) =>
          set((s) => {
            const draft = ensureDraftOnState(s, id);
            if (!draft) { return; }
            const trimmed = name.trim();
            if (!trimmed || trimmed === draft.name) { return; }
            draft.name = trimmed;
            recomputeTabDraftDirty(s, id);
          }),

        // ───── runtime ─────
        setStatus: (id, status, msg = '', remoteAddr) =>
          set((s) => {
            const sess = findSession(s.rootChildren, id);
            if (!sess) { return; }
            sess.status = status;
            sess.statusMsg = msg;
            if (remoteAddr !== undefined) { sess.remoteAddr = remoteAddr; }
          }),

        appendLog: (id, entry) =>
          set((s) => {
            const sess = findSession(s.rootChildren, id);
            if (!sess) { return; }
            if (sess.receiveSettings.pauseReceiving && entry.direction === 'recv') { return; }
            sess.logs.push({ ...entry, id: nextLogId() });
            if (sess.logs.length > LOGS_CAP) {
              sess.logs.splice(0, LOGS_TRIM);
            }
          }),

        appendLogs: (id, entries) =>
          set((s) => {
            const sess = findSession(s.rootChildren, id);
            if (!sess || entries.length === 0) { return; }
            const paused = sess.receiveSettings.pauseReceiving;
            for (const e of entries) {
              if (paused && e.direction === 'recv') { continue; }
              sess.logs.push({ ...e, id: nextLogId() });
            }
            if (sess.logs.length > LOGS_CAP) {
              sess.logs.splice(0, sess.logs.length - (LOGS_CAP - LOGS_TRIM));
            }
          }),

        clearLogs: (id) =>
          set((s) => {
            const sess = findSession(s.rootChildren, id);
            if (sess) { sess.logs = []; }
          }),

        addRxBytes: (id, n) =>
          set((s) => {
            const sess = findSession(s.rootChildren, id);
            if (sess) { sess.rxBytes += n; }
          }),

        addTxBytes: (id, n) =>
          set((s) => {
            const sess = findSession(s.rootChildren, id);
            if (sess) { sess.txBytes += n; }
          }),

        resetCounts: (id) =>
          set((s) => {
            const sess = findSession(s.rootChildren, id);
            if (!sess) { return; }
            sess.rxBytes = 0;
            sess.txBytes = 0;
            sess.trafficSamples = [];
          }),

        addTrafficSample: (id, sample) =>
          set((s) => {
            const sess = findSession(s.rootChildren, id);
            if (!sess) { return; }
            sess.trafficSamples.push(sample);
            if (sess.trafficSamples.length > TRAFFIC_MAX_SAMPLES) {
              sess.trafficSamples.splice(0, sess.trafficSamples.length - TRAFFIC_MAX_SAMPLES);
            }
          }),

        addSendHistory: (id, text) =>
          set((s) => {
            const normalized = text.trim();
            if (!normalized) { return; }
            const draft = ensureDraftOnState(s, id);
            if (!draft) { return; }
            if (draft.sendHistory.includes(normalized)) { return; }
            draft.sendHistory = [normalized, ...draft.sendHistory].slice(0, SEND_HISTORY_MAX);
            recomputeTabDraftDirty(s, id);
          }),

        removeSendHistory: (id, text) =>
          set((s) => {
            const draft = ensureDraftOnState(s, id);
            if (!draft) { return; }
            draft.sendHistory = draft.sendHistory.filter((t) => t !== text);
            recomputeTabDraftDirty(s, id);
          }),

        clearSendHistory: (id) =>
          set((s) => {
            const draft = ensureDraftOnState(s, id);
            if (!draft) { return; }
            draft.sendHistory = [];
            recomputeTabDraftDirty(s, id);
          }),

        addClient: (id, clientAddr) =>
          set((s) => {
            const sess = findSession(s.rootChildren, id);
            if (!sess) { return; }
            if (!sess.clients.includes(clientAddr)) {
              sess.clients.push(clientAddr);
            }
          }),

        removeClient: (id, clientAddr) =>
          set((s) => {
            const sess = findSession(s.rootChildren, id);
            if (!sess) { return; }
            sess.clients = sess.clients.filter((c) => c !== clientAddr);
          }),

        // ───── persistence ─────
        saveSession: (id) =>
          set((s) => {
            const sess = findSession(s.rootChildren, id);
            const draft = s.tabDrafts[id];
            if (!sess || !draft || !draft.dirty) { return; }
            applyDraftToSession(sess, draft);
            recomputeTabDraftDirty(s, id);
          }),

        discardAllUnsavedDrafts: () =>
          set((s) => {
            for (const [id, draft] of Object.entries(s.tabDrafts)) {
              if (!draft.dirty) { continue; }
              const sess = findSession(s.rootChildren, id);
              if (sess) {
                s.tabDrafts[id] = cloneDraftFromSession(sess);
              }
            }
          }),

        revertTabDraft: (id) =>
          set((s) => {
            const sess = findSession(s.rootChildren, id);
            if (!sess) { return; }
            s.tabDrafts[id] = cloneDraftFromSession(sess);
          }),

        saveAll: async () => {
          set((s) => {
            for (const [id, draft] of Object.entries(s.tabDrafts)) {
              if (!draft.dirty) { continue; }
              const sess = findSession(s.rootChildren, id);
              if (sess) {
                applyDraftToSession(sess, draft);
                recomputeTabDraftDirty(s, id);
              }
            }
          });
          await flushDeferred();
        },
      };
    }),
    {
      name: `${STORAGE_KEY}-sessions`,
      version: 4,
      storage: createJSONStorage(() => ({
        getItem: (name) => getCachedItem(name),
        setItem: (name, value) => setCachedItem(name, value),
        removeItem: (name) => removeCachedItem(name),
      })),
      // Development phase: data shape changed multiple times. Any payload
      // persisted under an older version cannot be safely upgraded, so we drop
      // it and let the store re-initialize.
      migrate: (_persisted, version) => {
        if (version < 4) {
          return undefined as unknown as PersistedSessionState;
        }
        return _persisted as PersistedSessionState;
      },
      partialize: (state): PersistedSessionState => {
        const serialize = (items: WorkspaceItem[]): PersistedWorkspaceItem[] =>
          items
            .map<PersistedWorkspaceItem | null>((it) => {
              if (isGroup(it)) {
                return {
                  kind: 'group',
                  id: it.id,
                  name: it.name,
                  expanded: it.expanded,
                  children: serialize(it.children),
                };
              }
              return {
                kind: 'session',
                id: it.id,
                name: it.name,
                config: it.config,
                receiveSettings: { ...it.receiveSettings, saveToFile: false },
                sendSettings: it.sendSettings,
                status: 'idle',
                statusMsg: '',
                logs: [],
                rxBytes: 0,
                txBytes: 0,
                trafficSamples: [],
                clients: it.clients,
                sendHistory: it.sendHistory,
                sendContent: it.sendContent,
                opened: false,
              };
            })
            .filter((x): x is PersistedWorkspaceItem => x !== null);

        return {
          rootChildren: serialize(state.rootChildren),
          activeSessionId: state.activeSessionId,
        };
      },
      // After hydration, re-open the previously active session (if any) so the
      // user lands on the tab they last used.
      onRehydrateStorage: () => (rehydrated) => {
        if (!rehydrated) { return; }
        const tabDrafts: Record<string, TabDraft> = {};
        let activeSessionId = rehydrated.activeSessionId;
        if (activeSessionId) {
          const target = findSession(rehydrated.rootChildren, activeSessionId);
          if (target) {
            target.opened = true;
            tabDrafts[target.id] = cloneDraftFromSession(target);
          } else {
            activeSessionId = null;
          }
        }
        if (!activeSessionId) {
          const first = [...iterSessions(rehydrated.rootChildren)][0];
          if (first) {
            first.opened = true;
            activeSessionId = first.id;
            tabDrafts[first.id] = cloneDraftFromSession(first);
          }
        }
        useSessionStore.setState({ tabDrafts, activeSessionId });
      },
      skipHydration: true,
    },
  ),
);

// ─────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────

/**
 * Pure selector — do not pass to `useSessionStore(getActiveSession)`; the merged
 * session is a new object every call. Subscribe to `rootChildren` / `tabDrafts` /
 * `activeSessionId` and memoize this function in the component instead.
 */
export const getActiveSession = (state: SessionViewState): Session | null => {
  if (!state.activeSessionId) { return null; }
  const s = findSession(state.rootChildren, state.activeSessionId);
  if (!s || !s.opened) { return null; }
  const draft = state.tabDrafts[state.activeSessionId];
  return draft ? mergeSessionWithDraft(s, draft) : s;
};

/** Tab bar view: merged session fields + whether the tab differs from the catalog. */
export const getOpenedTabView = (
  state: SessionViewState,
  sessionId: string,
): (Session & { tabDirty: boolean }) | null => {
  const s = findSession(state.rootChildren, sessionId);
  if (!s || !s.opened) { return null; }
  const draft = state.tabDrafts[sessionId];
  if (!draft) {
    return { ...s, tabDirty: false };
  }
  return { ...mergeSessionWithDraft(s, draft), tabDirty: draft.dirty };
};

/** Convenience: flat list of every session across the whole tree. */
export const getAllSessions = (state: Pick<SessionState, 'rootChildren'>): Session[] =>
  [...iterSessions(state.rootChildren)];

/** Whether any open tab has edits not yet committed to the catalog session. */
export const hasUnsavedSessions = (state: Pick<SessionState, 'tabDrafts'>): boolean =>
  Object.values(state.tabDrafts).some((d) => d.dirty);

/** Open tabs with uncommitted edits (for close-confirm UI). */
export const getDirtyOpenedTabs = (
  state: SessionViewState,
): Session[] =>
  getAllSessions(state)
    .filter((s) => s.opened && state.tabDrafts[s.id]?.dirty)
    .map((s) => {
      const draft = state.tabDrafts[s.id]!;
      return mergeSessionWithDraft(s as SessionItem, draft);
    });

/** Returns the group ancestry of a session, root-first. Empty array if the session lives at root. */
export const getSessionGroupPath = (
  state: Pick<SessionViewState, 'rootChildren'>,
  sessionId: string,
): GroupNode[] => {
  const path: GroupNode[] = [];
  function dfs(items: WorkspaceItem[], trail: GroupNode[]): boolean {
    for (const it of items) {
      if (isSession(it) && it.id === sessionId) {
        path.push(...trail);
        return true;
      }
      if (isGroup(it)) {
        if (dfs(it.children, [...trail, it])) { return true; }
      }
    }
    return false;
  }
  dfs(state.rootChildren, []);
  return path;
};

/** Re-export so other files can import without reaching into `../types`. */
export { isGroup, isSession };
