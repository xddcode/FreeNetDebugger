import type { HttpConfig } from '../../types/protocols/httpConfig';
import { cloneHttpConfig, normalizeHttpConfigForCompare } from '../../types/protocols/httpConfig';
import { exportHttpBody } from '../../utils/http';

export interface ExportedHttpProfile {
  _fndVersion: string;
  _type: 'fnd-http-config';
  exportedAt: number;
  name: string;
  protocol: 'HTTP';
  config: HttpConfig;
}

function stripEmptyKvRows<T extends { key: string }>(rows: T[]): T[] {
  return rows.filter((row) => row.key.trim() !== '');
}

export function sanitizeHttpConfigForExport(config: HttpConfig): HttpConfig {
  return {
    httpUrl: config.httpUrl,
    httpMethod: config.httpMethod,
    httpHeaders: stripEmptyKvRows(config.httpHeaders ?? []),
    httpParams: stripEmptyKvRows(config.httpParams ?? []),
    httpPathParams: stripEmptyKvRows(config.httpPathParams ?? []),
    httpBody: exportHttpBody(config.httpBody),
  };
}

export function buildHttpExportPayload(
  name: string,
  config: HttpConfig,
): ExportedHttpProfile {
  return {
    _fndVersion: '1.0',
    _type: 'fnd-http-config',
    exportedAt: Date.now(),
    name,
    protocol: 'HTTP',
    config: sanitizeHttpConfigForExport(config),
  };
}

export function isValidExportedHttpProfile(data: unknown): data is ExportedHttpProfile {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const d = data as Record<string, unknown>;
  return d._type === 'fnd-http-config' && typeof d.config === 'object' && d.config !== null;
}

/** Accept legacy fnd-session-config HTTP exports. */
export function parseHttpProfileImport(data: unknown): HttpConfig | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }
  const d = data as Record<string, unknown>;
  if (d._type === 'fnd-http-config' && d.config && typeof d.config === 'object') {
    return cloneHttpConfig(d.config as HttpConfig);
  }
  if (d._type === 'fnd-session-config' && d.config && typeof d.config === 'object') {
    const config = d.config as Record<string, unknown>;
    if (config.protocol === 'HTTP' || d.protocol === 'HTTP') {
      return sanitizeHttpConfigForExport({
        httpUrl: String(config.httpUrl ?? ''),
        httpMethod: (config.httpMethod ?? 'GET') as HttpConfig['httpMethod'],
        httpHeaders: Array.isArray(config.httpHeaders) ? config.httpHeaders as HttpConfig['httpHeaders'] : [],
        httpParams: Array.isArray(config.httpParams) ? config.httpParams as HttpConfig['httpParams'] : [],
        httpPathParams: Array.isArray(config.httpPathParams) ? config.httpPathParams as HttpConfig['httpPathParams'] : [],
        httpBody: (config.httpBody ?? { type: 'none' }) as HttpConfig['httpBody'],
      });
    }
  }
  return null;
}

export function httpConfigsEqual(a: HttpConfig, b: HttpConfig): boolean {
  return JSON.stringify(normalizeHttpConfigForCompare(a))
    === JSON.stringify(normalizeHttpConfigForCompare(b));
}
