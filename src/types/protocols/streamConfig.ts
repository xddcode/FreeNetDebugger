import type { ProtocolType, ReceiveSettings, SendSettings } from '../index';

export type StreamProtocolType = Exclude<ProtocolType, 'HTTP'>;

/** 流式协议连接参数 — 不含 HTTP 字段。 */
export interface StreamConnectionConfig {
  protocol: StreamProtocolType;
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

export interface StreamSessionSettings {
  receiveSettings: ReceiveSettings;
  sendSettings: SendSettings;
  sendContent: string;
  sendHistory: string[];
}

export function defaultStreamConnectionConfig(protocol: StreamProtocolType = 'TCP_CLIENT'): StreamConnectionConfig {
  return {
    protocol,
    remoteHost: '127.0.0.1',
    remotePort: 8080,
    localPort: 8080,
    localHost: '0.0.0.0',
    wsUrl: 'ws://127.0.0.1:8080',
    serialPort: '',
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
  };
}

export function defaultReceiveSettings(): ReceiveSettings {
  return {
    encoding: 'AUTO',
    asciiNonPrintable: 'DOT',
    autoNewline: true,
    saveToFile: false,
    pauseReceiving: false,
  };
}

export function defaultSendSettings(): SendSettings {
  return {
    encoding: 'ASCII',
    autoParseEscapes: true,
    autoCRLF: true,
    autoChecksum: false,
    checksumType: 'CRC16',
    periodicEnabled: false,
    periodicInterval: 1000,
  };
}

export function defaultStreamSessionSettings(): StreamSessionSettings {
  return {
    receiveSettings: defaultReceiveSettings(),
    sendSettings: defaultSendSettings(),
    sendContent: '',
    sendHistory: [],
  };
}

export function cloneStreamConnectionConfig(config: StreamConnectionConfig): StreamConnectionConfig {
  return { ...config };
}

export function cloneStreamSessionSettings(settings: StreamSessionSettings): StreamSessionSettings {
  return {
    receiveSettings: { ...settings.receiveSettings },
    sendSettings: { ...settings.sendSettings },
    sendContent: settings.sendContent,
    sendHistory: [...settings.sendHistory],
  };
}

/** 从旧版扁平 ConnectionConfig 提取流式连接配置。 */
export function streamConfigFromLegacy(raw: Record<string, unknown>): StreamConnectionConfig {
  const protocol = (typeof raw.protocol === 'string' ? raw.protocol : 'TCP_CLIENT') as StreamProtocolType;
  return {
    protocol,
    remoteHost: typeof raw.remoteHost === 'string' ? raw.remoteHost : '127.0.0.1',
    remotePort: typeof raw.remotePort === 'number' ? raw.remotePort : 8080,
    localPort: typeof raw.localPort === 'number' ? raw.localPort : 8080,
    localHost: typeof raw.localHost === 'string' ? raw.localHost : '0.0.0.0',
    wsUrl: typeof raw.wsUrl === 'string' ? raw.wsUrl : 'ws://127.0.0.1:8080',
    serialPort: typeof raw.serialPort === 'string' ? raw.serialPort : '',
    baudRate: typeof raw.baudRate === 'number' ? raw.baudRate : 115200,
    dataBits: (typeof raw.dataBits === 'number' ? raw.dataBits : 8) as StreamConnectionConfig['dataBits'],
    stopBits: (typeof raw.stopBits === 'number' ? raw.stopBits : 1) as StreamConnectionConfig['stopBits'],
    parity: (typeof raw.parity === 'string' ? raw.parity : 'none') as StreamConnectionConfig['parity'],
  };
}

export function isStreamProtocol(protocol: ProtocolType): protocol is StreamProtocolType {
  return protocol !== 'HTTP';
}
