import { describe, expect, it } from 'vitest';
import {
  formatHttpBodySize,
  getHttpResponseBodyTier,
  resolveHttpResponseEditorLanguage,
  shouldFormatResponseBody,
} from './httpResponseBodyTier';
import {
  HTTP_RESPONSE_BODY_FULL_BYTES,
  HTTP_RESPONSE_BODY_RAW_MAX_BYTES,
} from '../config/constants';

describe('getHttpResponseBodyTier', () => {
  it('returns full for bodies up to 5 MB', () => {
    expect(getHttpResponseBodyTier(0)).toBe('full');
    expect(getHttpResponseBodyTier(HTTP_RESPONSE_BODY_FULL_BYTES)).toBe('full');
  });

  it('returns raw between 5 MB and 20 MB', () => {
    expect(getHttpResponseBodyTier(HTTP_RESPONSE_BODY_FULL_BYTES + 1)).toBe('raw');
    expect(getHttpResponseBodyTier(HTTP_RESPONSE_BODY_RAW_MAX_BYTES)).toBe('raw');
  });

  it('returns blocked above 20 MB', () => {
    expect(getHttpResponseBodyTier(HTTP_RESPONSE_BODY_RAW_MAX_BYTES + 1)).toBe('blocked');
  });
});

describe('formatHttpBodySize', () => {
  it('formats bytes, KB, and MB', () => {
    expect(formatHttpBodySize(512)).toBe('512 B');
    expect(formatHttpBodySize(2048)).toBe('2.0 KB');
    expect(formatHttpBodySize(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

describe('resolveHttpResponseEditorLanguage', () => {
  it('uses syntax modes only in full tier', () => {
    expect(resolveHttpResponseEditorLanguage('full', 'json', false)).toBe('json');
    expect(resolveHttpResponseEditorLanguage('raw', 'json', false)).toBe('plaintext');
    expect(resolveHttpResponseEditorLanguage('blocked', 'json', true)).toBe('plaintext');
  });
});

describe('shouldFormatResponseBody', () => {
  it('pretty-prints only in full tier without force override', () => {
    expect(shouldFormatResponseBody('full', false)).toBe(true);
    expect(shouldFormatResponseBody('raw', false)).toBe(false);
    expect(shouldFormatResponseBody('full', true)).toBe(false);
  });
});
