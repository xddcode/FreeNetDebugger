import type {
  ConnectionConfig,
  TcpClientConfigView, TcpServerConfigView,
  UdpClientConfigView, UdpServerConfigView,
  WebSocketConfigView, SerialConfigView, HttpConfigView,
} from '../types';
import { isValidIPv4, isValidPort, isValidWsUrl } from './validation';

/* ─── Type guards ─── */

export function isTcpClient(config: ConnectionConfig): config is ConnectionConfig & TcpClientConfigView {
  return config.protocol === 'TCP_CLIENT';
}
export function isTcpServer(config: ConnectionConfig): config is ConnectionConfig & TcpServerConfigView {
  return config.protocol === 'TCP_SERVER';
}
export function isUdpClient(config: ConnectionConfig): config is ConnectionConfig & UdpClientConfigView {
  return config.protocol === 'UDP_CLIENT';
}
export function isUdpServer(config: ConnectionConfig): config is ConnectionConfig & UdpServerConfigView {
  return config.protocol === 'UDP_SERVER';
}
export function isWebSocket(config: ConnectionConfig): config is ConnectionConfig & WebSocketConfigView {
  return config.protocol === 'WEBSOCKET';
}
export function isSerial(config: ConnectionConfig): config is ConnectionConfig & SerialConfigView {
  return config.protocol === 'SERIAL';
}
export function isHttp(config: ConnectionConfig): config is ConnectionConfig & HttpConfigView {
  return config.protocol === 'HTTP';
}

/* ─── Field extractors (export) ─── */

export function extractTcpClient(config: ConnectionConfig): Partial<ConnectionConfig> & TcpClientConfigView {
  return { protocol: 'TCP_CLIENT', remoteHost: config.remoteHost, remotePort: config.remotePort, localPort: config.localPort };
}
export function extractTcpServer(config: ConnectionConfig): Partial<ConnectionConfig> & TcpServerConfigView {
  return { protocol: 'TCP_SERVER', localHost: config.localHost, localPort: config.localPort };
}
export function extractUdpClient(config: ConnectionConfig): Partial<ConnectionConfig> & UdpClientConfigView {
  return { protocol: 'UDP_CLIENT', remoteHost: config.remoteHost, remotePort: config.remotePort, localPort: config.localPort };
}
export function extractUdpServer(config: ConnectionConfig): Partial<ConnectionConfig> & UdpServerConfigView {
  return { protocol: 'UDP_SERVER', localHost: config.localHost, localPort: config.localPort };
}
export function extractWebSocket(config: ConnectionConfig): Partial<ConnectionConfig> & WebSocketConfigView {
  return { protocol: 'WEBSOCKET', wsUrl: config.wsUrl };
}
export function extractSerial(config: ConnectionConfig): Partial<ConnectionConfig> & SerialConfigView {
  return { protocol: 'SERIAL', serialPort: config.serialPort, baudRate: config.baudRate, dataBits: config.dataBits, stopBits: config.stopBits, parity: config.parity };
}
export function extractHttp(config: ConnectionConfig): Partial<ConnectionConfig> & HttpConfigView {
  return { protocol: 'HTTP', httpUrl: config.httpUrl, httpMethod: config.httpMethod, httpHeaders: config.httpHeaders, httpParams: config.httpParams, httpBody: config.httpBody };
}

export function extractProtocolConfig(config: ConnectionConfig): Partial<ConnectionConfig> {
  switch (config.protocol) {
    case 'TCP_CLIENT': return extractTcpClient(config);
    case 'TCP_SERVER': return extractTcpServer(config);
    case 'UDP_CLIENT': return extractUdpClient(config);
    case 'UDP_SERVER': return extractUdpServer(config);
    case 'WEBSOCKET':  return extractWebSocket(config);
    case 'SERIAL':     return extractSerial(config);
    case 'HTTP':       return extractHttp(config);
    default:           return { protocol: config.protocol };
  }
}

/* ─── Validation per protocol ─── */

export type ProtocolValidationErrors = Partial<Record<keyof ConnectionConfig, boolean>>;

export function validateProtocolConfig(config: ConnectionConfig): ProtocolValidationErrors {
  const errors: ProtocolValidationErrors = {};
  switch (config.protocol) {
    case 'TCP_CLIENT':
    case 'UDP_CLIENT':
      errors.remoteHost = !isValidIPv4(config.remoteHost);
      errors.remotePort = !isValidPort(config.remotePort);
      errors.localPort = !isValidPort(config.localPort, true);
      break;
    case 'TCP_SERVER':
      errors.localHost = !isValidIPv4(config.localHost);
      errors.localPort = !isValidPort(config.localPort);
      break;
    case 'UDP_SERVER':
      errors.localPort = !isValidPort(config.localPort, true);
      break;
    case 'WEBSOCKET':
      errors.wsUrl = !isValidWsUrl(config.wsUrl);
      break;
    case 'SERIAL':
      errors.serialPort = !config.serialPort;
      break;
    case 'HTTP':
      errors.httpUrl = !config.httpUrl || !config.httpUrl.startsWith('http');
      break;
  }
  return errors;
}

export function hasValidationErrors(errors: ProtocolValidationErrors): boolean {
  return Object.values(errors).some(Boolean);
}

/* ─── Display helpers ─── */

export function getProtocolAddress(config: ConnectionConfig): string {
  switch (config.protocol) {
    case 'TCP_CLIENT':
    case 'UDP_CLIENT':
      return `${config.remoteHost}:${config.remotePort}`;
    case 'TCP_SERVER':
    case 'UDP_SERVER':
      return `${config.localHost}:${config.localPort}`;
    case 'WEBSOCKET':
      return config.wsUrl;
    case 'SERIAL':
      return config.serialPort || '-';
    case 'HTTP':
      return config.httpUrl;
    default:
      return '-';
  }
}

/* ─── Snake-case payload builder (for Rust invoke) ─── */

export function buildConnectPayload(config: ConnectionConfig) {
  const base: Record<string, unknown> = { protocol: config.protocol };
  switch (config.protocol) {
    case 'TCP_CLIENT':
      return { ...base, remote_host: config.remoteHost, remote_port: config.remotePort, local_port: config.localPort || undefined };
    case 'TCP_SERVER':
      return { ...base, local_host: config.localHost, local_port: config.localPort };
    case 'UDP_CLIENT':
      return { ...base, remote_host: config.remoteHost, remote_port: config.remotePort, local_port: config.localPort || undefined };
    case 'UDP_SERVER':
      return { ...base, local_host: config.localHost, local_port: config.localPort };
    case 'WEBSOCKET':
      return { ...base, ws_url: config.wsUrl };
    case 'SERIAL':
      return { ...base, serial_port: config.serialPort, baud_rate: config.baudRate, data_bits: config.dataBits, stop_bits: config.stopBits, parity: config.parity };
    case 'HTTP': {
      const bodyStr = config.httpBody.type === 'none'
        ? undefined
        : config.httpBody.content;
      return { ...base, http_url: config.httpUrl, http_method: config.httpMethod, http_headers: config.httpHeaders, http_params: config.httpParams, http_body: bodyStr };
    }
    default:
      return base;
  }
}
