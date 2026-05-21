import type { HttpBody, HttpMethod, HttpQueryParam, LogEntry } from '../types';

export interface NormalizedHttpBody {
  type: 'none' | 'text' | 'json';
  content: string;
  textContent: string;
  jsonContent: string;
}

/** Parse stored body; keeps separate text/json caches for type switching. */
export function normalizeHttpBody(raw: unknown): NormalizedHttpBody {
  if (!raw || typeof raw !== 'object' || !('type' in raw)) {
    return { type: 'none', content: '', textContent: '', jsonContent: '' };
  }
  const b = raw as Record<string, unknown>;
  const type = b.type as NormalizedHttpBody['type'];
  const content = typeof b.content === 'string' ? b.content : '';
  const savedText = typeof b.textContent === 'string' ? b.textContent : '';
  const savedJson = typeof b.jsonContent === 'string' ? b.jsonContent : '';

  if (type === 'text') {
    const textContent = savedText || content;
    return { type: 'text', content: textContent, textContent, jsonContent: savedJson };
  }
  if (type === 'json') {
    const jsonContent = savedJson || content;
    return { type: 'json', content: jsonContent, textContent: savedText, jsonContent };
  }
  return { type: 'none', content: '', textContent: savedText, jsonContent: savedJson };
}

export function commitHttpBodyContent(normalized: NormalizedHttpBody, next: string): HttpBody {
  if (normalized.type === 'json') {
    return { type: 'json', content: next, textContent: normalized.textContent };
  }
  if (normalized.type === 'text') {
    return { type: 'text', content: next, jsonContent: normalized.jsonContent };
  }
  return { type: 'none', textContent: normalized.textContent, jsonContent: normalized.jsonContent };
}

/** Switch active body type without losing the other type's draft. */
export function switchHttpBodyType(
  normalized: NormalizedHttpBody,
  target: HttpBody['type'],
  pendingContent?: string,
): HttpBody {
  let textContent = normalized.textContent;
  let jsonContent = normalized.jsonContent;

  if (normalized.type === 'text') {
    textContent = pendingContent ?? normalized.content;
  } else if (normalized.type === 'json') {
    jsonContent = pendingContent ?? normalized.content;
  }

  if (target === 'none') {
    return { type: 'none', textContent, jsonContent };
  }
  if (target === 'text') {
    return { type: 'text', content: textContent, jsonContent };
  }
  return { type: 'json', content: jsonContent, textContent };
}

export const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

export const HTTP_METHODS_WITHOUT_BODY: HttpMethod[] = ['GET', 'HEAD', 'OPTIONS'];

export function methodAllowsBody(method: HttpMethod): boolean {
  return !HTTP_METHODS_WITHOUT_BODY.includes(method);
}

export function stripUrlQuery(url: string): string {
  if (!url) {
    return url;
  }
  return url.split('?')[0];
}

/** Build URL with query params — preserves path, replaces query string */
export function buildUrlWithParams(url: string, params: HttpQueryParam[]): string {
  if (!url) {
    return url;
  }
  const enabled = params.filter(p => p.enabled && p.key.trim());
  if (enabled.length === 0) {
    return stripUrlQuery(url);
  }
  const qs = enabled
    .map(p => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value)}`)
    .join('&');
  return `${stripUrlQuery(url)}?${qs}`;
}

export function isValidHttpUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

export function isHttpResponseSystemLog(entry: LogEntry): boolean {
  if (entry.direction !== 'system') {
    return false;
  }
  const text = new TextDecoder().decode(new Uint8Array(entry.data));
  return /^HTTP\s+\d{3}/.test(text);
}

/** Remove HTTP response status lines and their following recv body chunks from logs. */
export function stripHttpResponseLogs(logs: LogEntry[]): LogEntry[] {
  const next: LogEntry[] = [];
  for (let i = 0; i < logs.length; i++) {
    const entry = logs[i];
    if (isHttpResponseSystemLog(entry)) {
      if (i + 1 < logs.length && logs[i + 1].direction === 'recv') {
        i += 1;
      }
      continue;
    }
    next.push(entry);
  }
  return next;
}

export function buildHttpResponseExportText(res: {
  statusCode: number;
  statusText: string;
  elapsedMs: number;
  headers: Record<string, string>;
  bodyText: string;
}): string {
  const headerLines = Object.entries(res.headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  const head = `HTTP ${res.statusCode} ${res.statusText} (${res.elapsedMs} ms)\n${headerLines}`;
  return res.bodyText ? `${head}\n\n${res.bodyText}` : head;
}

/** Pretty-print JSON response bodies for display and export. */
export function formatResponseBodyText(bodyText: string, mode: 'json' | 'html' | 'xml' | 'text'): string {
  const trimmed = bodyText.trim();
  if (!trimmed) {
    return bodyText;
  }
  if (mode === 'html' || mode === 'xml') {
    return bodyText;
  }
  const looksLikeJson = mode === 'json' || trimmed.startsWith('{') || trimmed.startsWith('[');
  if (!looksLikeJson) {
    return bodyText;
  }
  try {
    return `${JSON.stringify(JSON.parse(trimmed), null, 2)}\n`;
  } catch {
    return bodyText;
  }
}

export function suggestHttpResponseFileName(statusCode: number, contentType: string): string {
  const ct = contentType.toLowerCase();
  const ext = ct.includes('application/json') ? 'json'
    : ct.includes('text/html') ? 'html'
      : ct.includes('xml') ? 'xml'
        : 'txt';
  return `http-response-${statusCode}.${ext}`;
}
