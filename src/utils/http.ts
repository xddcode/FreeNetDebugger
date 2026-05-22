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

export function exportHttpBody(raw: HttpBody): HttpBody {
  const normalized = normalizeHttpBody(raw);
  if (normalized.type === 'none') {
    const body: HttpBody = { type: 'none' };
    if (normalized.textContent) {
      body.textContent = normalized.textContent;
    }
    if (normalized.jsonContent) {
      body.jsonContent = normalized.jsonContent;
    }
    return body;
  }
  if (normalized.type === 'text') {
    const body: HttpBody = { type: 'text', content: normalized.content };
    if (normalized.jsonContent) {
      body.jsonContent = normalized.jsonContent;
    }
    return body;
  }
  const body: HttpBody = { type: 'json', content: normalized.content };
  if (normalized.textContent) {
    body.textContent = normalized.textContent;
  }
  return body;
}

export const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

export const HTTP_METHODS_WITHOUT_BODY: HttpMethod[] = ['GET', 'HEAD', 'OPTIONS'];

export function methodAllowsBody(method: HttpMethod): boolean {
  return !HTTP_METHODS_WITHOUT_BODY.includes(method);
}

/** Path segment placeholder — `:id` or `:12` in `/users/:id` (not host port). */
const PATH_PARAM_NAME = /:([A-Za-z0-9_]+)/g;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Extract pathname from URL; falls back when input is still being edited. */
export function extractUrlPathname(url: string): string {
  if (!url) {
    return '/';
  }
  try {
    return new URL(url).pathname;
  } catch {
    const withoutScheme = url.replace(/^https?:\/\//i, '');
    const slashIdx = withoutScheme.indexOf('/');
    if (slashIdx < 0) {
      return '/';
    }
    const pathPart = withoutScheme.slice(slashIdx);
    const qIndex = pathPart.indexOf('?');
    const hIndex = pathPart.indexOf('#');
    const end = Math.min(
      qIndex >= 0 ? qIndex : pathPart.length,
      hIndex >= 0 ? hIndex : pathPart.length,
    );
    return pathPart.slice(0, end) || '/';
  }
}

export interface UrlHighlightSegment {
  kind: 'text' | 'pathParam';
  text: string;
}

/** Index in full URL string where pathname begins (after host/port). */
export function findPathnameStartInUrl(url: string): number {
  if (!url) {
    return 0;
  }
  try {
    const parsed = new URL(url);
    if (parsed.pathname) {
      const idx = url.indexOf(parsed.pathname);
      if (idx >= 0) {
        return idx;
      }
    }
  } catch {
    // fall through for partial URLs while typing
  }
  const schemeMatch = url.match(/^https?:\/\//i);
  const schemeLen = schemeMatch ? schemeMatch[0].length : 0;
  const slashIdx = url.slice(schemeLen).indexOf('/');
  if (slashIdx < 0) {
    return url.length;
  }
  return schemeLen + slashIdx;
}

/** Split URL for overlay highlight — only `:name` in pathname, not host port. */
export function segmentUrlForPathHighlight(url: string): UrlHighlightSegment[] {
  if (!url) {
    return [];
  }

  const pathnameStart = findPathnameStartInUrl(url);
  const pathname = extractUrlPathname(url);
  const pathnameEnd = pathnameStart + pathname.length;

  const segments: UrlHighlightSegment[] = [];
  let lastIndex = 0;
  const pathRegion = url.slice(pathnameStart, pathnameEnd);

  for (const match of pathRegion.matchAll(PATH_PARAM_NAME)) {
    const matchStart = pathnameStart + (match.index ?? 0);
    const matchEnd = matchStart + match[0].length;

    if (matchStart > lastIndex) {
      segments.push({ kind: 'text', text: url.slice(lastIndex, matchStart) });
    }
    segments.push({ kind: 'pathParam', text: url.slice(matchStart, matchEnd) });
    lastIndex = matchEnd;
  }

  if (lastIndex < url.length) {
    segments.push({ kind: 'text', text: url.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ kind: 'text', text: url }];
}

/** Parse `:name` placeholders from URL path into param rows. Preserves existing values. */
export function mergePathParamsFromUrl(
  url: string,
  existing: HttpQueryParam[] = [],
): HttpQueryParam[] {
  const pathname = extractUrlPathname(url);
  const names: string[] = [];
  for (const match of pathname.matchAll(PATH_PARAM_NAME)) {
    const name = match[1];
    if (name && !names.includes(name)) {
      names.push(name);
    }
  }
  const existingMap = new Map(
    existing.filter((p) => p.key.trim()).map((p) => [p.key.trim(), p]),
  );
  return names.map((name) => {
    const prev = existingMap.get(name);
    return prev
      ? { ...prev, key: name }
      : { key: name, value: '', enabled: true };
  });
}

function substitutePathParams(path: string, pathParams: HttpQueryParam[]): string {
  let result = path;
  for (const param of pathParams) {
    if (!param.key.trim()) {
      continue;
    }
    const name = param.key.trim();
    const pattern = new RegExp(`:${escapeRegExp(name)}(?=/|$|\\?|#)`, 'g');
    result = result.replace(pattern, encodeURIComponent(param.value));
  }
  return result;
}

/** Replace `:name` segments with path param values. Query string is preserved. */
export function buildUrlWithPathParams(url: string, pathParams: HttpQueryParam[]): string {
  if (!url) {
    return url;
  }
  try {
    const parsed = new URL(url);
    parsed.pathname = substitutePathParams(parsed.pathname, pathParams);
    return parsed.toString();
  } catch {
    const pathname = extractUrlPathname(url);
    const prefix = url.slice(0, url.length - pathname.length);
    return prefix + substitutePathParams(pathname, pathParams);
  }
}

/** Apply path params then query params for the final request URL. */
export function resolveHttpRequestUrl(
  urlTemplate: string,
  pathParams: HttpQueryParam[],
  queryParams: HttpQueryParam[],
): string {
  const withPath = buildUrlWithPathParams(stripUrlQuery(urlTemplate), pathParams);
  return buildUrlWithParams(withPath, queryParams);
}

export function stripUrlQuery(url: string): string {
  if (!url) {
    return url;
  }
  const hashIndex = url.indexOf('#');
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const qIndex = withoutHash.indexOf('?');
  return qIndex >= 0 ? withoutHash.slice(0, qIndex) : withoutHash;
}

/** Parse query string from a URL into param rows (URL → Params sync). */
export function parseQueryParamsFromUrl(url: string): HttpQueryParam[] {
  if (!url) {
    return [];
  }
  const hashIndex = url.indexOf('#');
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const qIndex = withoutHash.indexOf('?');
  if (qIndex < 0) {
    return [];
  }
  const qs = withoutHash.slice(qIndex + 1);
  if (!qs) {
    return [];
  }

  return qs.split('&').flatMap((pair) => {
    if (!pair) {
      return [];
    }
    const eqIndex = pair.indexOf('=');
    const decodePart = (part: string) => {
      try {
        return decodeURIComponent(part.replace(/\+/g, ' '));
      } catch {
        return part;
      }
    };
    if (eqIndex < 0) {
      const key = decodePart(pair);
      return key ? [{ key, value: '', enabled: true }] : [];
    }
    const key = decodePart(pair.slice(0, eqIndex));
    const value = decodePart(pair.slice(eqIndex + 1));
    return key ? [{ key, value, enabled: true }] : [];
  });
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

export function isHttpErrorSystemLog(entry: LogEntry): boolean {
  if (entry.direction !== 'system') {
    return false;
  }
  const text = new TextDecoder().decode(new Uint8Array(entry.data)).trim();
  if (/^HTTP\s+\d{3}/.test(text)) {
    return false;
  }
  return /^Error:/.test(text) || /^HTTP\s+/i.test(text);
}

/** Remove HTTP responses, error lines, and trailing recv bodies from logs. */
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
    if (isHttpErrorSystemLog(entry)) {
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
