import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  getCachedItem,
  setCachedItem,
  removeCachedItem,
  flushDeferred,
  persistSessionLayout,
} from './storage';
import { flushAllFieldEditors } from './fieldEditorFlushRegistry';
import {
  isGroup, isSession,
  type GroupNode, type SessionItem, type WorkspaceItem,
  type Session,
  type ReceiveSettings, type SendSettings,
  type LogEntry, type ProtocolType, type TrafficSample, type TabDraft,
  type HttpConfig, type StreamConnectionConfig,
  isHttpSessionItem,
  isStreamSessionItem,
  isStreamTabDraft,
  isHttpTabDraft,
  cloneDraftFromSessionItem,
  applyDraftToSessionItem,
  mergeSessionItemWithDraft,
  normalizeWorkspaceTree,
  defaultHttpConfig,
  defaultStreamConnectionConfig,
  defaultStreamSessionSettings,
} from '../types';
import { normalizeHttpConfigForCompare } from '../types/protocols/httpConfig';
import {
  TRAFFIC_MAX_SAMPLES, SEND_HISTORY_MAX, LOGS_CAP, LOGS_TRIM,
  STORAGE_KEY,
} from '../config/constants';
import { sortWorkspaceItemsInPlace } from '../utils/workspaceTree';
import { stripHttpResponseLogs } from '../utils/http';

let _logIdCounter = 0;
const nextLogId = () => Date.now() * 1000 + ((_logIdCounter++) % 1000);

const newSessionId = () => `sess_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
const newGroupId = () => `grp_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;

export function makeSession(protocol: ProtocolType = 'TCP_CLIENT', name?: string): SessionItem {
  const id = newSessionId();
  const sessionName = name?.trim() || `${protocol.replace('_', ' ')}`;
  const runtime = {
    kind: 'session' as const,
    id,
    name: sessionName,
    status: 'idle' as const,
    statusMsg: '',
    logs: [] as LogEntry[],
    rxBytes: 0,
    txBytes: 0,
    trafficSamples: [] as TrafficSample[],
    clients: [] as string[],
    opened: true,
  };

  if (protocol === 'HTTP') {
    return {
      ...runtime,
      protocol: 'HTTP',
      config: defaultHttpConfig(),
    };
  }

  return {
    ...runtime,
    ...defaultStreamSessionSettings(),
    protocol,
    config: defaultStreamConnectionConfig(protocol),
  };
}

function hasPendingFieldFlush(draft: TabDraft | undefined): boolean {
  return !!(draft && isHttpTabDraft(draft) && draft.pendingFieldFlush);
}

function editableFingerprint(draft: TabDraft): string {
  if (draft.protocol === 'HTTP') {
    return JSON.stringify({
      name: draft.name,
      config: normalizeHttpConfigForCompare(draft.config),
    });
  }
  return JSON.stringify({
    name: draft.name,
    config: draft.config,
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
  const catalog = cloneDraftFromSessionItem(sess);
  draft.dirty = editableFingerprint(draft) !== editableFingerprint(catalog);
}

function ensureDraftOnState(s: SessionViewState, id: string): TabDraft | null {
  const sess = findSession(s.rootChildren, id);
  if (!sess || !sess.opened) { return null; }
  if (!s.tabDrafts[id]) {
    s.tabDrafts[id] = cloneDraftFromSessionItem(sess);
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
  | Record<string, unknown>;

interface PersistedSessionState {
  rootChildren: PersistedWorkspaceItem[];
  activeSessionId: string | null;
  /** Tab bar state — which catalog sessions had an open tab at last save. */
  openedSessionIds: string[];
}

function collectOpenedSessionIds(state: SessionCore): string[] {
  return state.openedTabOrder.filter((id) => {
    const sess = findSession(state.rootChildren, id);
    return sess?.opened === true;
  });
}

function appendOpenTabOrder(s: SessionCore, id: string): void {
  if (!s.openedTabOrder.includes(id)) {
    s.openedTabOrder.push(id);
  }
}

function removeOpenTabOrder(s: SessionCore, id: string): void {
  s.openedTabOrder = s.openedTabOrder.filter((tabId) => tabId !== id);
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
  /** Tab bar display order (subset of open session ids). */
  openedTabOrder: string[];
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
  /** Reorder open tabs in the header tab bar. */
  reorderOpenTabs: (fromId: string, toId: string) => void;
  /** Replace full tab bar order (used by animated drag reorder). */
  setOpenTabOrder: (orderedIds: string[]) => void;

  // ───── per-session edits ─────
  updateConfig: (id: string, patch: Partial<HttpConfig & StreamConnectionConfig>) => void;
  /** HTTP params/headers: local form has edits not yet in tab draft config. */
  markDraftPendingFieldFlush: (id: string) => void;
  updateReceiveSettings: (id: string, patch: Partial<ReceiveSettings>) => void;
  updateSendSettings: (id: string, patch: Partial<SendSettings>) => void;
  updateSendContent: (id: string, content: string) => void;
  /** Sidebar / catalog rename — updates the persisted session immediately. */
  renameSession: (id: string, name: string) => void;
  /** Tab rename — only affects the open tab until the user saves. */
  renameSessionDraft: (id: string, name: string) => void;

  // ───── runtime ─────
  setStatus: (id: string, status: SessionItem['status'], msg?: string, remoteAddr?: string) => void;
  appendLog: (id: string, entry: Omit<LogEntry, 'id'>) => void;
  appendLogs: (id: string, entries: Omit<LogEntry, 'id'>[]) => void;
  clearLogs: (id: string) => void;
  clearHttpResponses: (id: string) => void;

  addRxBytes: (id: string, n: number) => void;
  addTxBytes: (id: string, n: number) => void;
  resetCounts: (id: string) => void;
  addTrafficSample: (id: string, sample: TrafficSample) => void;

  addSendHistory: (id: string, text: string) => void;
  removeSendHistory: (id: string, text: string) => void;
  clearSendHistory: (id: string) => void;

  addClient: (id: string, clientAddr: string) => void;
  removeClient: (id: string, clientAddr: string) => void;
  clearClients: (id: string) => void;

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
        tabDrafts: { [defaultSession.id]: cloneDraftFromSessionItem(defaultSession) },
        activeSessionId: defaultSession.id,
        openedTabOrder: [defaultSession.id],

        // ───── group CRUD ─────
        addGroup: (name, parentGroupId) => {
          const g = makeGroup(name);
          set((s) => {
            if (parentGroupId) {
              const parent = findGroup(s.rootChildren, parentGroupId);
              if (parent) {
                parent.children.push(g);
                parent.expanded = true;
                sortWorkspaceItemsInPlace(parent.children);
                return;
              }
            }
            s.rootChildren.push(g);
            sortWorkspaceItemsInPlace(s.rootChildren);
          });
          return g.id;
        },

        removeGroup: (id) => {
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
          });
          persistSessionLayout();
        },

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
        addSession: (protocol = 'TCP_CLIENT', name, parentGroupId) => {
          set((s) => {
            const ss = makeSession(protocol, name);
            s.tabDrafts[ss.id] = cloneDraftFromSessionItem(ss);
            if (parentGroupId) {
              const parent = findGroup(s.rootChildren, parentGroupId);
              if (parent) {
                parent.children.push(ss);
                parent.expanded = true;
                sortWorkspaceItemsInPlace(parent.children);
                s.activeSessionId = ss.id;
                return;
              }
            }
            s.rootChildren.push(ss);
            sortWorkspaceItemsInPlace(s.rootChildren);
            s.activeSessionId = ss.id;
            appendOpenTabOrder(s, ss.id);
          });
          persistSessionLayout();
        },

        removeSession: (id) => {
          set((s) => {
            const hit = findSessionParent(s.rootChildren, id);
            if (!hit) { return; }
            hit.parent.splice(hit.index, 1);
            delete s.tabDrafts[id];
            if (s.activeSessionId === id) {
              const closedIdx = s.openedTabOrder.indexOf(id);
              removeOpenTabOrder(s, id);
              s.activeSessionId = s.openedTabOrder[closedIdx] ?? s.openedTabOrder[closedIdx - 1] ?? null;
            } else {
              removeOpenTabOrder(s, id);
            }
          });
          persistSessionLayout();
        },

        closeSessionTab: (id) => {
          set((s) => {
            const sess = findSession(s.rootChildren, id);
            if (!sess) { return; }
            sess.opened = false;
            delete s.tabDrafts[id];
            if (s.activeSessionId === id) {
              const closedIdx = s.openedTabOrder.indexOf(id);
              const remaining = s.openedTabOrder.filter((tabId) => tabId !== id);
              s.activeSessionId = remaining[closedIdx] ?? remaining[closedIdx - 1] ?? null;
            }
            removeOpenTabOrder(s, id);
          });
          persistSessionLayout();
        },

        setActiveSession: (id) => {
          set((s) => {
            const sess = findSession(s.rootChildren, id);
            if (!sess) { return; }
            sess.opened = true;
            s.activeSessionId = id;
            appendOpenTabOrder(s, id);
            ensureDraftOnState(s, id);
            recomputeTabDraftDirty(s, id);
          });
          persistSessionLayout();
        },

        reorderOpenTabs: (fromId, toId) => {
          if (fromId === toId) { return; }
          set((s) => {
            const order = [...s.openedTabOrder];
            const fromIdx = order.indexOf(fromId);
            const toIdx = order.indexOf(toId);
            if (fromIdx < 0 || toIdx < 0) { return; }
            let insertIndex = toIdx;
            if (fromIdx < toIdx) {
              insertIndex -= 1;
            }
            order.splice(fromIdx, 1);
            order.splice(insertIndex, 0, fromId);
            s.openedTabOrder = order;
          });
          persistSessionLayout();
        },

        setOpenTabOrder: (orderedIds) => {
          set((s) => {
            const openSet = new Set(
              s.openedTabOrder.filter((id) => findSession(s.rootChildren, id)?.opened),
            );
            const next = orderedIds.filter((id) => openSet.has(id));
            for (const id of openSet) {
              if (!next.includes(id)) {
                next.push(id);
              }
            }
            s.openedTabOrder = next;
          });
          persistSessionLayout();
        },

        // ───── per-session edits ─────
        updateConfig: (id, patch) =>
          set((s) => {
            const draft = ensureDraftOnState(s, id);
            if (!draft) { return; }
            Object.assign(draft.config, patch);
            if (isHttpTabDraft(draft)) {
              draft.pendingFieldFlush = false;
            }
            recomputeTabDraftDirty(s, id);
          }),

        markDraftPendingFieldFlush: (id) =>
          set((s) => {
            const draft = ensureDraftOnState(s, id);
            if (draft && isHttpTabDraft(draft)) {
              draft.pendingFieldFlush = true;
            }
          }),

        updateReceiveSettings: (id, patch) =>
          set((s) => {
            const draft = ensureDraftOnState(s, id);
            if (!draft || !isStreamTabDraft(draft)) { return; }
            Object.assign(draft.receiveSettings, patch);
            recomputeTabDraftDirty(s, id);
          }),

        updateSendSettings: (id, patch) =>
          set((s) => {
            const draft = ensureDraftOnState(s, id);
            if (!draft || !isStreamTabDraft(draft)) { return; }
            Object.assign(draft.sendSettings, patch);
            recomputeTabDraftDirty(s, id);
          }),

        updateSendContent: (id, content) =>
          set((s) => {
            const draft = ensureDraftOnState(s, id);
            if (!draft || !isStreamTabDraft(draft)) { return; }
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
            // TCP server client list is runtime-only — clear when not actively listening.
            if (status !== 'listening') {
              sess.clients = [];
            }
          }),

        appendLog: (id, entry) =>
          set((s) => {
            const sess = findSession(s.rootChildren, id);
            if (!sess) { return; }
            if (
              isStreamSessionItem(sess)
              && sess.receiveSettings.pauseReceiving
              && entry.direction === 'recv'
            ) {
              return;
            }
            sess.logs.push({ ...entry, id: nextLogId() });
            if (sess.logs.length > LOGS_CAP) {
              sess.logs.splice(0, LOGS_TRIM);
            }
          }),

        appendLogs: (id, entries) =>
          set((s) => {
            const sess = findSession(s.rootChildren, id);
            if (!sess || entries.length === 0) { return; }
            const paused = isStreamSessionItem(sess) && sess.receiveSettings.pauseReceiving;
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

        clearHttpResponses: (id) =>
          set((s) => {
            const sess = findSession(s.rootChildren, id);
            if (sess) {
              sess.logs = stripHttpResponseLogs(sess.logs);
            }
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
            if (!draft || !isStreamTabDraft(draft)) { return; }
            if (draft.sendHistory.includes(normalized)) { return; }
            draft.sendHistory = [normalized, ...draft.sendHistory].slice(0, SEND_HISTORY_MAX);
            recomputeTabDraftDirty(s, id);
          }),

        removeSendHistory: (id, text) =>
          set((s) => {
            const draft = ensureDraftOnState(s, id);
            if (!draft || !isStreamTabDraft(draft)) { return; }
            draft.sendHistory = draft.sendHistory.filter((t) => t !== text);
            recomputeTabDraftDirty(s, id);
          }),

        clearSendHistory: (id) =>
          set((s) => {
            const draft = ensureDraftOnState(s, id);
            if (!draft || !isStreamTabDraft(draft)) { return; }
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

        clearClients: (id) =>
          set((s) => {
            const sess = findSession(s.rootChildren, id);
            if (sess) { sess.clients = []; }
          }),

        // ───── persistence ─────
        saveSession: (id) => {
          flushAllFieldEditors(id);
          set((s) => {
            const sess = findSession(s.rootChildren, id);
            const draft = s.tabDrafts[id];
            if (!sess || !draft || !draft.dirty) { return; }
            applyDraftToSessionItem(sess, draft);
            recomputeTabDraftDirty(s, id);
          });
        },

        discardAllUnsavedDrafts: () =>
          set((s) => {
            for (const [id, draft] of Object.entries(s.tabDrafts)) {
              if (!draft.dirty) { continue; }
              const sess = findSession(s.rootChildren, id);
              if (sess) {
                s.tabDrafts[id] = cloneDraftFromSessionItem(sess);
              }
            }
          }),

        revertTabDraft: (id) =>
          set((s) => {
            const sess = findSession(s.rootChildren, id);
            if (!sess) { return; }
            s.tabDrafts[id] = cloneDraftFromSessionItem(sess);
          }),

        saveAll: async () => {
          flushAllFieldEditors();
          set((s) => {
            for (const [id, draft] of Object.entries(s.tabDrafts)) {
              if (!draft.dirty) { continue; }
              const sess = findSession(s.rootChildren, id);
              if (sess) {
                applyDraftToSessionItem(sess, draft);
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
      version: 6,
      storage: createJSONStorage(() => ({
        getItem: (name) => getCachedItem(name),
        setItem: (name, value) => setCachedItem(name, value),
        removeItem: (name) => removeCachedItem(name),
      })),
      // Development phase: data shape changed multiple times. Any payload
      // persisted under an older version cannot be safely upgraded, so we drop
      // it and let the store re-initialize.
      migrate: (persisted, version) => {
        if (version < 4) {
          return undefined as unknown as PersistedSessionState;
        }
        const p = persisted as PersistedSessionState & { openedSessionIds?: string[] };
        if (version < 5) {
          const legacyIds =
            p.openedSessionIds
            ?? (p.activeSessionId ? [p.activeSessionId] : []);
          return { ...p, openedSessionIds: legacyIds };
        }
        if (version < 6) {
          return {
            ...p,
            rootChildren: normalizeWorkspaceTree(p.rootChildren as unknown[]),
          };
        }
        return p;
      },
      partialize: (state): PersistedSessionState => {
        const openedSessionIds = collectOpenedSessionIds(state);
        const openedSet = new Set(openedSessionIds);

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
              const runtime = {
                kind: 'session' as const,
                id: it.id,
                name: it.name,
                status: 'idle' as const,
                statusMsg: '',
                logs: [],
                rxBytes: 0,
                txBytes: 0,
                trafficSamples: [],
                clients: [],
                opened: openedSet.has(it.id),
              };
              if (isHttpSessionItem(it)) {
                return {
                  ...runtime,
                  protocol: 'HTTP',
                  config: it.config,
                };
              }
              return {
                ...runtime,
                protocol: it.protocol,
                config: it.config,
                receiveSettings: { ...it.receiveSettings, saveToFile: false },
                sendSettings: it.sendSettings,
                sendHistory: it.sendHistory,
                sendContent: it.sendContent,
              };
            })
            .filter((x): x is PersistedWorkspaceItem => x !== null);

        return {
          rootChildren: serialize(state.rootChildren),
          activeSessionId: state.activeSessionId,
          openedSessionIds,
        };
      },
      // After hydration, restore every tab that was open at last save.
      onRehydrateStorage: () => (state) => {
        if (!state) { return; }
        const rehydrated = state as unknown as PersistedSessionState;
        const rootChildren = normalizeWorkspaceTree(rehydrated.rootChildren as unknown[]);
        const tabDrafts: Record<string, TabDraft> = {};
        const openedIds = new Set(
          rehydrated.openedSessionIds?.length
            ? rehydrated.openedSessionIds
            : [...iterSessions(rootChildren)].filter((s) => s.opened).map((s) => s.id),
        );

        sortWorkspaceItemsInPlace(rootChildren);

        for (const sess of iterSessions(rootChildren)) {
          sess.status = 'idle';
          sess.statusMsg = '';
          sess.remoteAddr = undefined;
          sess.clients = [];
          if (openedIds.has(sess.id)) {
            sess.opened = true;
            tabDrafts[sess.id] = cloneDraftFromSessionItem(sess);
          } else {
            sess.opened = false;
          }
        }

        let activeSessionId = rehydrated.activeSessionId;
        if (!activeSessionId || !openedIds.has(activeSessionId)) {
          activeSessionId = rehydrated.openedSessionIds?.find((id: string) => openedIds.has(id))
            ?? [...openedIds][0]
            ?? null;
        }

        if (openedIds.size === 0) {
          const first = [...iterSessions(rootChildren)][0];
          if (first) {
            first.opened = true;
            activeSessionId = first.id;
            tabDrafts[first.id] = cloneDraftFromSessionItem(first);
            openedIds.add(first.id);
          }
        }

        const openedTabOrder = rehydrated.openedSessionIds?.length
          ? rehydrated.openedSessionIds.filter((id: string) => openedIds.has(id))
          : [...openedIds];

        useSessionStore.setState({
          rootChildren,
          tabDrafts,
          activeSessionId,
          openedTabOrder,
        });
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
  return draft ? mergeSessionItemWithDraft(s, draft) : s;
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
  return { ...mergeSessionItemWithDraft(s, draft), tabDirty: draft.dirty || hasPendingFieldFlush(draft) };
};

/** Open tabs in tab-bar order. */
export const getOpenedTabSessions = (
  state: SessionViewState,
): (Session & { tabDirty: boolean })[] =>
  state.openedTabOrder
    .map((id) => getOpenedTabView(state, id))
    .filter((v): v is NonNullable<typeof v> => v !== null);

/** Merged HTTP tab config (draft overrides catalog). */
export const getHttpTabConfig = (
  state: SessionViewState,
  sessionId: string,
): HttpConfig | null => {
  const s = findSession(state.rootChildren, sessionId);
  if (!s || s.protocol !== 'HTTP') { return null; }
  const draft = state.tabDrafts[sessionId];
  if (draft?.protocol === 'HTTP') {
    return draft.config;
  }
  return s.config;
};

/** Merged stream tab config (draft overrides catalog). */
export const getStreamTabConfig = (
  state: SessionViewState,
  sessionId: string,
): StreamConnectionConfig | null => {
  const s = findSession(state.rootChildren, sessionId);
  if (!s || s.protocol === 'HTTP') { return null; }
  const draft = state.tabDrafts[sessionId];
  if (draft && draft.protocol !== 'HTTP') {
    return draft.config;
  }
  return s.config;
};

/** @deprecated Use getHttpTabConfig or getStreamTabConfig */
export const getSessionTabConfig = getHttpTabConfig;

/** Whether any open tab has unsaved edits (including unflushed HTTP field editors). */
export const hasUnsavedSessions = (state: Pick<SessionState, 'tabDrafts'>): boolean =>
  Object.values(state.tabDrafts).some((d) => d.dirty || hasPendingFieldFlush(d));

/** Convenience: flat list of every session across the whole tree. */
export const getAllSessions = (state: Pick<SessionState, 'rootChildren'>): SessionItem[] =>
  [...iterSessions(state.rootChildren)];

/** Open tabs with uncommitted edits (for close-confirm UI). */
export const getDirtyOpenedTabs = (
  state: SessionViewState,
): Session[] =>
  getAllSessions(state)
    .filter((s) => {
      const draft = state.tabDrafts[s.id];
      return s.opened && draft && (draft.dirty || hasPendingFieldFlush(draft));
    })
    .map((s) => {
      const draft = state.tabDrafts[s.id]!;
      return mergeSessionItemWithDraft(s, draft);
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
