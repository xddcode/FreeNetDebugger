import {
  HTTP_RESPONSE_BODY_FULL_BYTES,
  HTTP_RESPONSE_BODY_RAW_MAX_BYTES,
} from '../config/constants';

export type HttpResponseBodyTier = 'full' | 'raw' | 'blocked';

export function getHttpResponseBodyTier(bodySize: number): HttpResponseBodyTier {
  if (bodySize > HTTP_RESPONSE_BODY_RAW_MAX_BYTES) {
    return 'blocked';
  }
  if (bodySize > HTTP_RESPONSE_BODY_FULL_BYTES) {
    return 'raw';
  }
  return 'full';
}

export function formatHttpBodySize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

export function resolveHttpResponseEditorLanguage(
  tier: HttpResponseBodyTier,
  detectedMode: 'json' | 'html' | 'xml' | 'text',
  forcePlainText: boolean,
): string {
  if (tier === 'raw' || tier === 'blocked' || forcePlainText) {
    return 'plaintext';
  }
  if (detectedMode === 'json') {
    return 'json';
  }
  if (detectedMode === 'html') {
    return 'html';
  }
  if (detectedMode === 'xml') {
    return 'xml';
  }
  return 'plaintext';
}

export function shouldFormatResponseBody(
  tier: HttpResponseBodyTier,
  forcePlainText: boolean,
): boolean {
  return tier === 'full' && !forcePlainText;
}
