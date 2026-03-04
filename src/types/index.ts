export type ProtocolType =
  | 'TCP_CLIENT'
  | 'TCP_SERVER'
  | 'UDP_CLIENT'
  | 'UDP_SERVER'
  | 'WEBSOCKET'
  | 'SERIAL';

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'error'
  | 'disconnecting';

export type EncodingMode = 'AUTO' | 'ASCII' | 'HEX' | 'HEX_TEXT' | 'UTF8' | 'BASE64';
export type ChecksumType = 'CRC16' | 'LRC' | 'SUM8';
export type AsciiNonPrintableMode = 'DOT' | 'HEX';

export interface QuickCommand {
  id: string;
  name: string;
  data: string;
  encoding: EncodingMode;
}

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
}

export interface ReceiveSettings {
  encoding: EncodingMode;
  asciiNonPrintable: AsciiNonPrintableMode;
  showAsLog: boolean;
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

// ─────────────────────────────────────────────────────────────────
// PRO-version extension interfaces (not activated in MVP)
// These define the contract for the future script-based protocol
// parser feature. The Pro version will allow users to write a JS
// function `parse_payload(bytes: number[]): ParsedFrame` that is
// executed in an isolated sandbox for every received packet.
// The result is rendered in a "Structured Data Tree" panel.
// ─────────────────────────────────────────────────────────────────

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
  /** Last 30 sent texts for history recall */
  sendHistory: string[];
  // [PRO] optional script parser for this session
  parser?: ProtocolParser;
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
