import type { ReceiveSettings, SendSettings } from '../../types';
import type { StreamConnectionConfig, StreamSessionSettings } from '../../types/protocols/streamConfig';
import {
  cloneStreamConnectionConfig,
  cloneStreamSessionSettings,
  defaultStreamSessionSettings,
} from '../../types/protocols/streamConfig';
import { extractProtocolConfig } from '../../utils/protocolConfig';

export interface ExportedStreamProfile {
  _fndVersion: string;
  _type: 'fnd-stream-config';
  exportedAt: number;
  name: string;
  protocol: StreamConnectionConfig['protocol'];
  config: StreamConnectionConfig;
  receiveSettings: ReceiveSettings;
  sendSettings: SendSettings;
}

export function buildStreamExportPayload(
  name: string,
  config: StreamConnectionConfig,
  settings: StreamSessionSettings,
): ExportedStreamProfile {
  return {
    _fndVersion: '1.0',
    _type: 'fnd-stream-config',
    exportedAt: Date.now(),
    name,
    protocol: config.protocol,
    config: extractProtocolConfig(config) as StreamConnectionConfig,
    receiveSettings: { ...settings.receiveSettings },
    sendSettings: { ...settings.sendSettings },
  };
}

export function isValidExportedStreamProfile(data: unknown): data is ExportedStreamProfile {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const d = data as Record<string, unknown>;
  return d._type === 'fnd-stream-config' && typeof d.config === 'object' && d.config !== null;
}

export interface ParsedStreamProfileImport {
  config: StreamConnectionConfig;
  receiveSettings: ReceiveSettings;
  sendSettings: SendSettings;
}

/** Accept legacy fnd-session-config stream exports. */
export function parseStreamProfileImport(data: unknown): ParsedStreamProfileImport | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }
  const d = data as Record<string, unknown>;
  const defaults = defaultStreamSessionSettings();

  if (d._type === 'fnd-stream-config' && d.config && typeof d.config === 'object') {
    const config = d.config as StreamConnectionConfig;
    return {
      config: cloneStreamConnectionConfig(config),
      receiveSettings: {
        ...defaults.receiveSettings,
        ...(d.receiveSettings as ReceiveSettings | undefined),
      },
      sendSettings: {
        ...defaults.sendSettings,
        ...(d.sendSettings as SendSettings | undefined),
      },
    };
  }

  if (d._type === 'fnd-session-config' && d.config && typeof d.config === 'object') {
    const config = d.config as StreamConnectionConfig & { protocol?: string };
    if (d.protocol === 'HTTP') {
      return null;
    }
    return {
      config: extractProtocolConfig({
        ...config,
        protocol: (config.protocol ?? d.protocol ?? 'TCP_CLIENT') as StreamConnectionConfig['protocol'],
      }) as StreamConnectionConfig,
      receiveSettings: {
        ...defaults.receiveSettings,
        ...(d.receiveSettings as ReceiveSettings | undefined),
      },
      sendSettings: {
        ...defaults.sendSettings,
        ...(d.sendSettings as SendSettings | undefined),
      },
    };
  }

  return null;
}

export function cloneStreamProfileSettings(settings: StreamSessionSettings): StreamSessionSettings {
  return cloneStreamSessionSettings(settings);
}
