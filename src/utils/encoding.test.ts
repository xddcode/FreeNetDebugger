import { describe, it, expect } from 'vitest';
import {
  bytesToHex, hexToBytes, bytesToAscii, bytesToUtf8,
  bytesToAuto, bytesToHexText, bytesToDisplay,
  bytesToBase64, asciiToBytes, base64ToBytes,
  parseEscapeSequences, formatTimestamp,
} from './encoding';

describe('bytesToHex', () => {
  it('converts bytes to uppercase hex with spaces', () => {
    expect(bytesToHex([0, 255, 16])).toBe('00 FF 10');
  });
  it('returns empty string for empty array', () => {
    expect(bytesToHex([])).toBe('');
  });
});

describe('hexToBytes', () => {
  it('parses hex with spaces', () => {
    expect(hexToBytes('00 FF 10')).toEqual([0, 255, 16]);
  });
  it('parses hex without spaces', () => {
    expect(hexToBytes('00FF10')).toEqual([0, 255, 16]);
  });
  it('returns empty array for odd length', () => {
    expect(hexToBytes('0FF')).toEqual([]);
  });
  it('returns empty array for invalid hex', () => {
    expect(hexToBytes('0G')).toEqual([]);
  });
});

describe('bytesToAscii', () => {
  it('shows printable characters', () => {
    expect(bytesToAscii([72, 101, 108, 108, 111])).toBe('Hello');
  });
  it('shows dots for non-printable', () => {
    expect(bytesToAscii([0, 31, 127])).toBe('...');
  });
  it('shows hex for non-printable when mode is HEX', () => {
    expect(bytesToAscii([0, 255], 'HEX')).toBe('\\x00\\xFF');
  });
});

describe('bytesToUtf8', () => {
  it('decodes valid UTF-8', () => {
    expect(bytesToUtf8([72, 101, 108, 108, 111])).toBe('Hello');
  });
  it('uses replacement characters for invalid UTF-8', () => {
    expect(bytesToUtf8([0xFF, 0xFE])).toBe('��');
  });
});

describe('bytesToAuto', () => {
  it('returns text for printable UTF-8', () => {
    expect(bytesToAuto([72, 101, 108, 108, 111])).toBe('Hello');
  });
  it('returns hex for non-text bytes', () => {
    expect(bytesToAuto([0xFF, 0xFE])).toBe('FF FE');
  });
});

describe('bytesToHexText', () => {
  it('returns both hex and text', () => {
    const result = bytesToHexText([72, 101, 108, 108, 111]);
    expect(result.hex).toBe('48 65 6C 6C 6F');
    expect(result.text).toBe('Hello');
  });
});

describe('bytesToDisplay', () => {
  it('uses HEX encoding', () => {
    expect(bytesToDisplay([0, 255], 'HEX')).toBe('00 FF');
  });
  it('uses UTF8 encoding', () => {
    expect(bytesToDisplay([72, 101, 108, 108, 111], 'UTF8')).toBe('Hello');
  });
  it('uses ASCII encoding', () => {
    expect(bytesToDisplay([72, 101, 108, 108, 111], 'ASCII')).toBe('Hello');
  });
  it('uses AUTO encoding', () => {
    expect(bytesToDisplay([72, 101, 108, 108, 111], 'AUTO')).toBe('Hello');
  });
  it('uses HEX_TEXT encoding', () => {
    expect(bytesToDisplay([72, 101, 108, 108, 111], 'HEX_TEXT')).toBe('48 65 6C 6C 6F\nHello');
  });
});

describe('bytesToBase64', () => {
  it('encodes to base64', () => {
    expect(bytesToBase64([72, 101, 108, 108, 111])).toBe('SGVsbG8=');
  });
});

describe('asciiToBytes', () => {
  it('encodes ascii string to bytes', () => {
    expect(asciiToBytes('Hello')).toEqual([72, 101, 108, 108, 111]);
  });
});

describe('base64ToBytes', () => {
  it('decodes base64 to bytes', () => {
    expect(base64ToBytes('SGVsbG8=')).toEqual([72, 101, 108, 108, 111]);
  });
  it('returns empty array for invalid base64', () => {
    expect(base64ToBytes('!!!')).toEqual([]);
  });
});

describe('parseEscapeSequences', () => {
  it('parses \\n', () => {
    expect(parseEscapeSequences('a\\nb')).toBe('a\nb');
  });
  it('parses \\r', () => {
    expect(parseEscapeSequences('a\\rb')).toBe('a\rb');
  });
  it('parses \\t', () => {
    expect(parseEscapeSequences('a\\tb')).toBe('a\tb');
  });
  it('parses \\xNN', () => {
    expect(parseEscapeSequences('\\x41')).toBe('A');
  });
  it('parses \\0', () => {
    expect(parseEscapeSequences('a\\0b')).toBe('a\0b');
  });
});

describe('formatTimestamp', () => {
  it('formats a timestamp correctly', () => {
    const ts = new Date('2024-01-15T09:30:45.123Z').getTime();
    const result = formatTimestamp(ts);
    expect(result).toMatch(/^2024-01-15 \d{2}:\d{2}:\d{2}\.\d{3}$/);
  });
});
