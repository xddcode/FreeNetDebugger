import type {
  ConnectionStatus,
  GroupNode,
  LogEntry,
  ProtocolParser,
  ProtocolType,
  TrafficSample,
} from '../index';
import type { HttpConfig } from './httpConfig';
import { cloneHttpConfig, httpConfigFromLegacy } from './httpConfig';
import type { StreamConnectionConfig, StreamSessionSettings } from './streamConfig';
import {
  cloneStreamConnectionConfig,
  defaultStreamSessionSettings,
  isStreamProtocol,
  streamConfigFromLegacy,
} from './streamConfig';

export { defaultStreamConnectionConfig, defaultStreamSessionSettings, isStreamProtocol } from './streamConfig';
export { defaultHttpConfig, defaultHttpConfig as createDefaultHttpConfig } from './httpConfig';

export interface SessionRuntimeBase {
  kind: 'session';
  id: string;
  name: string;
  status: ConnectionStatus;
  statusMsg: string;
  logs: LogEntry[];
  rxBytes: number;
  txBytes: number;
  remoteAddr?: string;
  trafficSamples: TrafficSample[];
  clients: string[];
  opened: boolean;
  parser?: ProtocolParser;
}

export type HttpSessionItem = SessionRuntimeBase & {
  protocol: 'HTTP';
  config: HttpConfig;
};

export type StreamSessionItem = SessionRuntimeBase & StreamSessionSettings & {
  protocol: StreamProtocolType;
  config: StreamConnectionConfig;
};

export type StreamProtocolType = StreamConnectionConfig['protocol'];

export type SessionItem = HttpSessionItem | StreamSessionItem;

export type HttpSession = Omit<HttpSessionItem, 'kind'>;
export type StreamSession = Omit<StreamSessionItem, 'kind'>;
export type Session = HttpSession | StreamSession;

export type HttpTabDraft = {
  protocol: 'HTTP';
  name: string;
  config: HttpConfig;
  dirty: boolean;
  pendingFieldFlush?: boolean;
};

export type StreamTabDraft = StreamSessionSettings & {
  protocol: StreamProtocolType;
  name: string;
  config: StreamConnectionConfig;
  dirty: boolean;
};

export type TabDraft = HttpTabDraft | StreamTabDraft;

export function isHttpSessionItem(session: SessionItem): session is HttpSessionItem {
  return session.protocol === 'HTTP';
}

export function isStreamSessionItem(session: SessionItem): session is StreamSessionItem {
  return session.protocol !== 'HTTP';
}

export function isHttpSession(session: Session): session is HttpSession {
  return session.protocol === 'HTTP';
}

export function isStreamSession(session: Session): session is StreamSession {
  return session.protocol !== 'HTTP';
}

export function isHttpTabDraft(draft: TabDraft): draft is HttpTabDraft {
  return draft.protocol === 'HTTP';
}

export function isStreamTabDraft(draft: TabDraft): draft is StreamTabDraft {
  return draft.protocol !== 'HTTP';
}

export function cloneDraftFromSessionItem(sess: SessionItem): TabDraft {
  if (isHttpSessionItem(sess)) {
    return {
      protocol: 'HTTP',
      name: sess.name,
      config: cloneHttpConfig(sess.config),
      dirty: false,
    };
  }
  return {
    protocol: sess.protocol,
    name: sess.name,
    config: cloneStreamConnectionConfig(sess.config),
    receiveSettings: { ...sess.receiveSettings },
    sendSettings: { ...sess.sendSettings },
    sendContent: sess.sendContent,
    sendHistory: [...sess.sendHistory],
    dirty: false,
  };
}

export function applyDraftToSessionItem(sess: SessionItem, draft: TabDraft): void {
  sess.name = draft.name;
  if (isHttpSessionItem(sess) && isHttpTabDraft(draft)) {
    sess.config = cloneHttpConfig(draft.config);
    return;
  }
  if (isStreamSessionItem(sess) && isStreamTabDraft(draft)) {
    sess.config = cloneStreamConnectionConfig(draft.config);
    sess.receiveSettings = { ...draft.receiveSettings };
    sess.sendSettings = { ...draft.sendSettings };
    sess.sendContent = draft.sendContent;
    sess.sendHistory = [...draft.sendHistory];
  }
}

export function mergeSessionItemWithDraft(sess: SessionItem, draft: TabDraft): Session {
  if (isHttpSessionItem(sess) && isHttpTabDraft(draft)) {
    return {
      ...sess,
      name: draft.name,
      config: draft.config,
    };
  }
  if (isStreamSessionItem(sess) && isStreamTabDraft(draft)) {
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
  return sess;
}

/** 持久化/旧版 JSON → 规范化 SessionItem。 */
export function normalizePersistedSessionItem(raw: Record<string, unknown>): SessionItem | null {
  if (raw.kind !== 'session' || typeof raw.id !== 'string') {
    return null;
  }

  const configRaw = (raw.config && typeof raw.config === 'object'
    ? raw.config
    : {}) as Record<string, unknown>;

  const protocol = (typeof configRaw.protocol === 'string'
    ? configRaw.protocol
    : typeof raw.protocol === 'string'
      ? raw.protocol
      : 'TCP_CLIENT') as ProtocolType;

  const base: SessionRuntimeBase = {
    kind: 'session',
    id: raw.id,
    name: typeof raw.name === 'string' ? raw.name : 'Session',
    status: (typeof raw.status === 'string' ? raw.status : 'idle') as ConnectionStatus,
    statusMsg: typeof raw.statusMsg === 'string' ? raw.statusMsg : '',
    logs: Array.isArray(raw.logs) ? raw.logs as LogEntry[] : [],
    rxBytes: typeof raw.rxBytes === 'number' ? raw.rxBytes : 0,
    txBytes: typeof raw.txBytes === 'number' ? raw.txBytes : 0,
    remoteAddr: typeof raw.remoteAddr === 'string' ? raw.remoteAddr : undefined,
    trafficSamples: Array.isArray(raw.trafficSamples) ? raw.trafficSamples as TrafficSample[] : [],
    clients: Array.isArray(raw.clients) ? raw.clients as string[] : [],
    opened: raw.opened === true,
    parser: raw.parser as ProtocolParser | undefined,
  };

  if (protocol === 'HTTP') {
    return {
      ...base,
      protocol: 'HTTP',
      config: httpConfigFromLegacy(configRaw),
    };
  }

  if (!isStreamProtocol(protocol)) {
    return null;
  }

  const streamSettings = defaultStreamSessionSettings();
  if (raw.receiveSettings && typeof raw.receiveSettings === 'object') {
    streamSettings.receiveSettings = {
      ...streamSettings.receiveSettings,
      ...(raw.receiveSettings as StreamSessionSettings['receiveSettings']),
    };
  }
  if (raw.sendSettings && typeof raw.sendSettings === 'object') {
    streamSettings.sendSettings = {
      ...streamSettings.sendSettings,
      ...(raw.sendSettings as StreamSessionSettings['sendSettings']),
    };
  }
  streamSettings.sendContent = typeof raw.sendContent === 'string' ? raw.sendContent : '';
  streamSettings.sendHistory = Array.isArray(raw.sendHistory) ? raw.sendHistory as string[] : [];

  return {
    ...base,
    ...streamSettings,
    protocol,
    config: streamConfigFromLegacy(configRaw),
  };
}

/** 持久化树 / 旧版 JSON → 规范化 workspace 树。 */
export function normalizeWorkspaceTree(items: unknown[]): (GroupNode | SessionItem)[] {
  const normalized: (GroupNode | SessionItem)[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const it = raw as Record<string, unknown>;
    if (it.kind === 'group') {
      normalized.push({
        kind: 'group',
        id: String(it.id),
        name: typeof it.name === 'string' ? it.name : 'Group',
        expanded: it.expanded !== false,
        children: normalizeWorkspaceTree(Array.isArray(it.children) ? it.children : []),
      });
      continue;
    }
    const session = normalizePersistedSessionItem(it);
    if (session) {
      normalized.push(session);
    }
  }
  return normalized;
}
