import type { Session } from '../../../types';

export interface ParsedHttpResponse {
  statusCode: number;
  statusText: string;
  elapsedMs: number;
  headers: Record<string, string>;
  /** Raw body text (same as fullBodyText unless backend truncated). */
  bodyText: string;
  /** Full raw body for copy/download. */
  fullBodyText: string;
  bodySize: number;
  /** True when backend delivered a partial body (see status-line marker). */
  bodyTruncated: boolean;
  contentType: string;
  timestamp: number;
}

export interface ParsedHttpError {
  message: string;
  timestamp: number;
}

const HTTP_STATUS_LINE = /^HTTP\s+(\d{3})\s+(.+?)\s*\((\d+)\s*ms\)(?:\s*\[body-truncated:(\d+)\/(\d+)\])?\n/;

function decodeLogText(data: number[]): string {
  return new TextDecoder().decode(new Uint8Array(data));
}

export function parseHttpErrorMessage(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  if (/^HTTP\s+\d{3}/.test(trimmed)) {
    return null;
  }
  const errorMatch = trimmed.match(/^Error:\s*(.+)$/s);
  if (errorMatch) {
    return errorMatch[1].trim();
  }
  const sendFailMatch = trimmed.match(/^HTTP\s+(.+)$/s);
  if (sendFailMatch) {
    return sendFailMatch[1].trim();
  }
  return null;
}

export function parseHttpResponseAt(logs: Session['logs'], systemIndex: number): ParsedHttpResponse | null {
  const entry = logs[systemIndex];
  if (entry.direction !== 'system') {
    return null;
  }
  const text = decodeLogText(entry.data);
  const match = text.match(HTTP_STATUS_LINE);
  if (!match) {
    return null;
  }
  const statusCode = parseInt(match[1], 10);
  const statusText = match[2].trim();
  const elapsedMs = parseInt(match[3], 10);
  const truncatedBytes = match[4] ? parseInt(match[4], 10) : null;
  const totalBytes = match[5] ? parseInt(match[5], 10) : null;

  const afterStatus = text.slice(match[0].length);
  const headers: Record<string, string> = {};
  let contentType = '';
  for (const line of afterStatus.split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim().toLowerCase();
      const value = line.slice(idx + 1).trim();
      headers[key] = value;
      if (key === 'content-type') {
        contentType = value;
      }
    }
  }

  let fullBodyText = '';
  for (let j = systemIndex + 1; j < logs.length; j++) {
    if (logs[j].direction === 'recv') {
      fullBodyText = decodeLogText(logs[j].data);
      break;
    }
  }

  const bodySize = totalBytes ?? fullBodyText.length;
  const bodyTruncated = truncatedBytes !== null && totalBytes !== null && truncatedBytes < totalBytes;

  return {
    statusCode,
    statusText,
    elapsedMs,
    headers,
    bodyText: fullBodyText,
    fullBodyText,
    bodySize,
    bodyTruncated,
    contentType,
    timestamp: entry.timestamp,
  };
}

export function parseHttpResponse(logs: Session['logs']): ParsedHttpResponse | null {
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].direction !== 'system') {
      continue;
    }
    const parsed = parseHttpResponseAt(logs, i);
    if (parsed) {
      return parsed;
    }
  }
  return null;
}

export function findHttpResponseAfter(logs: Session['logs'], since: number): ParsedHttpResponse | null {
  for (let i = logs.length - 1; i >= 0; i--) {
    const entry = logs[i];
    if (entry.timestamp < since) {
      break;
    }
    if (entry.direction !== 'system') {
      continue;
    }
    const parsed = parseHttpResponseAt(logs, i);
    if (parsed) {
      return parsed;
    }
  }
  return null;
}

export function findHttpErrorAfter(logs: Session['logs'], since: number): ParsedHttpError | null {
  for (let i = logs.length - 1; i >= 0; i--) {
    const entry = logs[i];
    if (entry.timestamp < since) {
      break;
    }
    if (entry.direction !== 'system') {
      continue;
    }
    const message = parseHttpErrorMessage(decodeLogText(entry.data));
    if (message) {
      return { message, timestamp: entry.timestamp };
    }
  }
  return null;
}

export function findLatestHttpError(logs: Session['logs']): ParsedHttpError | null {
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].direction !== 'system') {
      continue;
    }
    const message = parseHttpErrorMessage(decodeLogText(logs[i].data));
    if (message) {
      return { message, timestamp: logs[i].timestamp };
    }
  }
  return null;
}

export function statusPalette(code: number): string {
  if (code >= 200 && code < 300) {
    return 'success';
  }
  if (code >= 300 && code < 500) {
    return 'warning';
  }
  if (code >= 500) {
    return 'danger';
  }
  return 'fg.muted';
}

export function detectBodyMode(contentType: string): 'json' | 'html' | 'xml' | 'text' {
  const ct = contentType.toLowerCase();
  if (ct.includes('application/json')) {
    return 'json';
  }
  if (ct.includes('text/html')) {
    return 'html';
  }
  if (ct.includes('application/xml') || ct.includes('text/xml')) {
    return 'xml';
  }
  return 'text';
}

export const HTTP_PANEL_TOOLBAR_PROPS = {
  align: 'center' as const,
  minH: '10',
  py: '2',
  px: '4',
  flexShrink: 0,
};
