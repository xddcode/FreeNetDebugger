export type ProtocolType =
  | 'TCP_CLIENT'
  | 'TCP_SERVER'
  | 'UDP_CLIENT'
  | 'UDP_SERVER'
  | 'WEBSOCKET'
  | 'SERIAL'
  | 'HTTP';

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'error'
  | 'disconnecting';

export type EncodingMode = 'AUTO' | 'ASCII' | 'HEX' | 'HEX_TEXT' | 'UTF8' | 'BASE64';
export type ChecksumType = 'CRC8' | 'CRC16' | 'CRC32' | 'LRC' | 'XOR' | 'SUM8';
export type AsciiNonPrintableMode = 'DOT' | 'HEX';

export interface QuickCommand {
  id: string;
  name: string;
  data: string;
  encoding: EncodingMode;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface HttpHeader {
  key: string;
  value: string;
  enabled: boolean;
}

export interface HttpQueryParam {
  key: string;
  value: string;
  enabled: boolean;
}

export type HttpBody =
  | { type: 'none' }
  | { type: 'text'; content: string }
  | { type: 'json'; content: string };

export interface ConnectionConfig {
  protocol: ProtocolType;
  remoteHost: string;
  remotePort: number;
  localPort: number;
  localHost: string;
  wsUrl: string;
  serialPort: string;
  baudRate: number;
  dataBits: 5 | 6 | 7 | 8;
  stopBits: 1 | 2;
  parity: 'none' | 'odd' | 'even';
  httpUrl: string;
  httpMethod: HttpMethod;
  httpHeaders: HttpHeader[];
  httpParams: HttpQueryParam[];
  httpBody: HttpBody;
}

/** Protocol-specific config views — used for type-safe UI isolation */
export interface TcpClientConfigView { remoteHost: string; remotePort: number; localPort: number; }
export interface TcpServerConfigView { localHost: string; localPort: number; }
export interface UdpClientConfigView { remoteHost: string; remotePort: number; localPort: number; }
export interface UdpServerConfigView { localHost: string; localPort: number; }
export interface WebSocketConfigView { wsUrl: string; }
export interface SerialConfigView { serialPort: string; baudRate: number; dataBits: 5 | 6 | 7 | 8; stopBits: 1 | 2; parity: 'none' | 'odd' | 'even'; }
export interface HttpConfigView { httpUrl: string; httpMethod: HttpMethod; httpHeaders: HttpHeader[]; httpParams: HttpQueryParam[]; httpBody: HttpBody; }

export interface ReceiveSettings {
  encoding: EncodingMode;
  asciiNonPrintable: AsciiNonPrintableMode;
  autoNewline: boolean;
  saveToFile: boolean;
  pauseReceiving: boolean;
}

export interface SendSettings {
  encoding: EncodingMode;
  autoParseEscapes: boolean;
  autoCRLF: boolean;
  autoChecksum: boolean;
  checksumType: ChecksumType;
  periodicEnabled: boolean;
  periodicInterval: number;
}

export interface LogEntry {
  id: number;
  timestamp: number;
  direction: 'send' | 'recv' | 'system';
  data: number[];
  source?: string;
  // [PRO] Future: parsed result from user script
  parsedResult?: ParsedFrame;
}

/** 每秒流量采样点 */
export interface TrafficSample {
  ts: number;
  rxRate: number;   // bytes/s this second
  txRate: number;   // bytes/s this second
  rxTotal: number;  // cumulative
  txTotal: number;
}

// PRO-version extension interfaces (not activated in MVP)
// These define the contract for the future script-based protocol
// parser feature. The Pro version will allow users to write a JS
// function `parse_payload(bytes: number[]): ParsedFrame` that is
// executed in an isolated sandbox for every received packet.
// The result is rendered in a "Structured Data Tree" panel.

export interface ParsedFrame {
  fields: ParsedField[];
  raw: number[];
  timestamp: number;
  label?: string;
}

export interface ParsedField {
  key: string;
  value: string | number | boolean;
  unit?: string;
  /** Controls badge color in the tree view */
  status?: 'ok' | 'warn' | 'error';
}

/**
 * Per-session protocol parser configuration.
 * [PRO] Stored alongside the session; editor shows the script.
 */
export interface ProtocolParser {
  id: string;
  name: string;
  /** JavaScript source for `function parse_payload(bytes) { ... }` */
  script: string;
  enabled: boolean;
  lastResult?: ParsedFrame;
}

export interface Session {
  id: string;
  name: string;
  config: ConnectionConfig;
  status: ConnectionStatus;
  statusMsg: string;
  receiveSettings: ReceiveSettings;
  sendSettings: SendSettings;
  logs: LogEntry[];
  rxBytes: number;
  txBytes: number;
  remoteAddr?: string;
  trafficSamples: TrafficSample[];
  /** Connected clients (TCP Server only). Runtime-only — not persisted. */
  clients: string[];
  /** Last 30 sent texts for history recall */
  sendHistory: string[];
  /** Per-session send input content */
  sendContent: string;
  /**
   * Runtime-only flag: whether the session is currently shown as a tab.
   * Closing a tab flips this to false but does NOT delete the session — the
   * session still lives in the workspace tree. Deletion happens via the sidebar.
   * Persisted via `openedSessionIds` so open tabs survive app restart.
   */
  opened: boolean;
  // [PRO] optional script parser for this session
  parser?: ProtocolParser;
}

/**
 * Per-tab working copy of editable session fields. Runtime data (logs, status,
 * traffic) stays on the catalog `Session`; edits in an open tab go here until
 * the user saves, which commits the draft back to the session.
 */
export interface TabDraft {
  name: string;
  config: ConnectionConfig;
  receiveSettings: ReceiveSettings;
  sendSettings: SendSettings;
  sendContent: string;
  sendHistory: string[];
  dirty: boolean;
}

/**
 * The workspace is a Bruno-style tree:
 *   workspace root
 *   ├── session            (loose session at root)
 *   ├── group
 *   │   ├── session
 *   │   └── nested group ...
 *   └── ...
 *
 * Groups are optional — sessions may live directly at the root. A group can
 * contain a mix of nested groups and sessions. Items are kept in display order
 * inside the `children` array.
 */
export interface GroupNode {
  /** Discriminator. Lets `WorkspaceItem` be narrowed with `isGroup()`. */
  kind: 'group';
  id: string;
  name: string;
  /** UI-only: whether the group is expanded in the sidebar tree. */
  expanded: boolean;
  children: WorkspaceItem[];
}

export type SessionItem = Session & { kind: 'session' };

export type WorkspaceItem = GroupNode | SessionItem;

export function isGroup(item: WorkspaceItem): item is GroupNode {
  return item.kind === 'group';
}

export function isSession(item: WorkspaceItem): item is SessionItem {
  return item.kind === 'session';
}

export interface Script {
  id: string;
  name: string;
  source: string;
  enabled: boolean;
  autoRun: boolean;
  linkedSessionIds: string[];
}

export type ScriptStatus = 'idle' | 'running' | 'error' | 'success';

export interface ScriptExecution {
  scriptId: string;
  sessionId: string;
  status: ScriptStatus;
  output: string[];
  error?: string;
  startedAt: number;
  endedAt?: number;
}

export interface TauriDataEvent {
  connection_id: string;
  direction: 'send' | 'recv' | 'system';
  data: number[];
  source?: string;
  timestamp: number;
}

export interface TauriStatusEvent {
  connection_id: string;
  status: string;
  message: string;
}

export interface SystemStats {
  cpu_percent: number;
  mem_used: number;
  mem_total: number;
  mem_percent: number;
}
