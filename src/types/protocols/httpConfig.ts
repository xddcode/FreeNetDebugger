import type { HttpBody, HttpHeader, HttpMethod, HttpQueryParam } from '../index';

/** HTTP 协议独立配置 — 不含任何流式协议字段。 */
export interface HttpConfig {
  httpUrl: string;
  httpMethod: HttpMethod;
  httpHeaders: HttpHeader[];
  httpParams: HttpQueryParam[];
  httpPathParams: HttpQueryParam[];
  httpBody: HttpBody;
}

export function defaultHttpConfig(): HttpConfig {
  return {
    httpUrl: 'https://httpbin.org/get',
    httpMethod: 'GET',
    httpHeaders: [],
    httpParams: [],
    httpPathParams: [],
    httpBody: { type: 'none' },
  };
}

export function cloneHttpConfig(config: HttpConfig): HttpConfig {
  return JSON.parse(JSON.stringify(config)) as HttpConfig;
}

type KvRow = { key: string; value: string; enabled: boolean };

function ensureTrailingKvRow<T extends KvRow>(rows: T[]): T[] {
  const last = rows[rows.length - 1];
  if (!last || last.key.trim() !== '') {
    return [...rows, { key: '', value: '', enabled: true } as T];
  }
  return rows;
}

/** 用于 dirty 比较 — 补齐 UI 尾随空行。 */
export function normalizeHttpConfigForCompare(config: HttpConfig): HttpConfig {
  const c = cloneHttpConfig(config);
  c.httpHeaders = ensureTrailingKvRow(c.httpHeaders ?? []);
  c.httpParams = ensureTrailingKvRow(c.httpParams ?? []);
  c.httpPathParams = (c.httpPathParams ?? []).filter((p) => p.key.trim());
  return c;
}

/** 从旧版扁平 ConnectionConfig 提取 HTTP 配置。 */
export function httpConfigFromLegacy(raw: Record<string, unknown>): HttpConfig {
  return {
    httpUrl: typeof raw.httpUrl === 'string' ? raw.httpUrl : defaultHttpConfig().httpUrl,
    httpMethod: (typeof raw.httpMethod === 'string' ? raw.httpMethod : 'GET') as HttpMethod,
    httpHeaders: Array.isArray(raw.httpHeaders) ? raw.httpHeaders as HttpHeader[] : [],
    httpParams: Array.isArray(raw.httpParams) ? raw.httpParams as HttpQueryParam[] : [],
    httpPathParams: Array.isArray(raw.httpPathParams) ? raw.httpPathParams as HttpQueryParam[] : [],
    httpBody: (raw.httpBody && typeof raw.httpBody === 'object'
      ? raw.httpBody
      : { type: 'none' }) as HttpBody,
  };
}
