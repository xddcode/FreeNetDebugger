import type {
  HttpConfig,
  StreamConnectionConfig,
  ProtocolType,
  TcpClientConfigView, TcpServerConfigView,
  UdpClientConfigView, UdpServerConfigView,
  WebSocketConfigView, SerialConfigView,
} from '../types';
import { sanitizeHttpConfigForExport } from '../services/profiles/httpProfile';
import { isStreamProtocol } from '../types/protocols/streamConfig';
import { isValidIPv4, isValidPort, isValidWsUrl } from './validation';

export { isStreamProtocol };

export function isTcpClient(config: StreamConnectionConfig): config is StreamConnectionConfig & TcpClientConfigView {
  return config.protocol === 'TCP_CLIENT';
}
export function isTcpServer(config: StreamConnectionConfig): config is StreamConnectionConfig & TcpServerConfigView {
  return config.protocol === 'TCP_SERVER';
}
export function isUdpClient(config: StreamConnectionConfig): config is StreamConnectionConfig & UdpClientConfigView {
  return config.protocol === 'UDP_CLIENT';
}
export function isUdpServer(config: StreamConnectionConfig): config is StreamConnectionConfig & UdpServerConfigView {
  return config.protocol === 'UDP_SERVER';
}
export function isWebSocket(config: StreamConnectionConfig): config is StreamConnectionConfig & WebSocketConfigView {
  return config.protocol === 'WEBSOCKET';
}
export function isSerial(config: StreamConnectionConfig): config is StreamConnectionConfig & SerialConfigView {
  return config.protocol === 'SERIAL';
}

const streamShell = (config: StreamConnectionConfig, protocol: StreamConnectionConfig['protocol']) => ({
  protocol,
  remoteHost: config.remoteHost,
  remotePort: config.remotePort,
  localPort: config.localPort,
  localHost: config.localHost,
  wsUrl: config.wsUrl,
  serialPort: config.serialPort,
  baudRate: config.baudRate,
  dataBits: config.dataBits,
  stopBits: config.stopBits,
  parity: config.parity,
});

export function extractTcpClient(config: StreamConnectionConfig): StreamConnectionConfig & TcpClientConfigView {
  return streamShell(config, 'TCP_CLIENT');
}
export function extractTcpServer(config: StreamConnectionConfig): StreamConnectionConfig & TcpServerConfigView {
  return streamShell(config, 'TCP_SERVER');
}
export function extractUdpClient(config: StreamConnectionConfig): StreamConnectionConfig & UdpClientConfigView {
  return streamShell(config, 'UDP_CLIENT');
}
export function extractUdpServer(config: StreamConnectionConfig): StreamConnectionConfig & UdpServerConfigView {
  return streamShell(config, 'UDP_SERVER');
}
export function extractWebSocket(config: StreamConnectionConfig): StreamConnectionConfig & WebSocketConfigView {
  return streamShell(config, 'WEBSOCKET');
}
export function extractSerial(config: StreamConnectionConfig): StreamConnectionConfig & SerialConfigView {
  return streamShell(config, 'SERIAL');
}
export function extractHttp(config: HttpConfig): HttpConfig {
  return sanitizeHttpConfigForExport(config);
}

export function extractProtocolConfig(
  config: HttpConfig | StreamConnectionConfig,
): HttpConfig | StreamConnectionConfig {
  if ('httpUrl' in config) {
    return extractHttp(config);
  }
  switch (config.protocol) {
    case 'TCP_CLIENT': return extractTcpClient(config);
    case 'TCP_SERVER': return extractTcpServer(config);
    case 'UDP_CLIENT': return extractUdpClient(config);
    case 'UDP_SERVER': return extractUdpServer(config);
    case 'WEBSOCKET': return extractWebSocket(config);
    case 'SERIAL': return extractSerial(config);
    default: return config;
  }
}

export type ProtocolValidationErrors = Partial<Record<string, boolean>>;

export function validateStreamConfig(config: StreamConnectionConfig): ProtocolValidationErrors {
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
  }
  return errors;
}

export function validateHttpConfig(config: HttpConfig): ProtocolValidationErrors {
  return {
    httpUrl: !config.httpUrl || !config.httpUrl.startsWith('http'),
  };
}

export function validateProtocolConfig(
  config: StreamConnectionConfig | (HttpConfig & { protocol?: ProtocolType }),
): ProtocolValidationErrors {
  if ('httpUrl' in config) {
    return validateHttpConfig(config);
  }
  return validateStreamConfig(config);
}

export function hasValidationErrors(errors: ProtocolValidationErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export function getStreamProtocolAddress(config: StreamConnectionConfig): string {
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
    default:
      return '-';
  }
}

export function getHttpProtocolAddress(config: HttpConfig): string {
  return config.httpUrl;
}

export function formatStreamProtocolLabel(protocol: StreamConnectionConfig['protocol']): string {
  return protocol.replace('_', ' ');
}

export function getProtocolAddress(config: StreamConnectionConfig | HttpConfig): string {
  if ('httpUrl' in config) {
    return getHttpProtocolAddress(config);
  }
  return getStreamProtocolAddress(config);
}

export function buildConnectPayload(
  protocol: ProtocolType,
  config: StreamConnectionConfig | HttpConfig,
) {
  if (protocol === 'HTTP' && 'httpUrl' in config) {
    const bodyStr = config.httpBody.type === 'none'
      ? undefined
      : config.httpBody.content;
    return {
      protocol: 'HTTP' as const,
      http_url: config.httpUrl,
      http_method: config.httpMethod,
      http_headers: config.httpHeaders,
      http_params: config.httpParams,
      http_body: bodyStr,
    };
  }

  const stream = config as StreamConnectionConfig;
  const base: Record<string, unknown> = { protocol: stream.protocol };
  switch (stream.protocol) {
    case 'TCP_CLIENT':
      return { ...base, remote_host: stream.remoteHost, remote_port: stream.remotePort, local_port: stream.localPort || undefined };
    case 'TCP_SERVER':
      return { ...base, local_host: stream.localHost, local_port: stream.localPort };
    case 'UDP_CLIENT':
      return { ...base, remote_host: stream.remoteHost, remote_port: stream.remotePort, local_port: stream.localPort || undefined };
    case 'UDP_SERVER':
      return { ...base, local_host: stream.localHost, local_port: stream.localPort };
    case 'WEBSOCKET':
      return { ...base, ws_url: stream.wsUrl };
    case 'SERIAL':
      return { ...base, serial_port: stream.serialPort, baud_rate: stream.baudRate, data_bits: stream.dataBits, stop_bits: stream.stopBits, parity: stream.parity };
    default:
      return base;
  }
}
