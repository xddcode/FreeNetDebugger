import type { AsciiNonPrintableMode, EncodingMode } from '../types';

export function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
}

export function hexToBytes(hex: string): number[] {
  const cleaned = hex.replace(/\s+/g, '');
  if (cleaned.length % 2 !== 0) return [];
  const bytes: number[] = [];
  for (let i = 0; i < cleaned.length; i += 2) {
    const val = parseInt(cleaned.substring(i, i + 2), 16);
    if (isNaN(val)) return [];
    bytes.push(val);
  }
  return bytes;
}

export function bytesToAscii(bytes: number[], nonPrintable: AsciiNonPrintableMode = 'DOT'): string {
  return bytes.map((b) => {
    if (b >= 32 && b < 127) return String.fromCharCode(b);
    return nonPrintable === 'HEX' ? `\\x${b.toString(16).padStart(2, '0').toUpperCase()}` : '.';
  }).join('');
}

export function bytesToUtf8(bytes: number[], nonPrintable: AsciiNonPrintableMode = 'DOT'): string {
  try {
    return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
  } catch {
    return bytesToAscii(bytes, nonPrintable);
  }
}

function tryDecodeUtf8Strict(bytes: number[]): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
  } catch {
    return null;
  }
}

function isMostlyPrintableText(text: string): boolean {
  if (!text) return false;
  let nonPrintable = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    const isCtrl = c < 32 || c === 127;
    const isAllowedCtrl = c === 9 || c === 10 || c === 13;
    if (isCtrl && !isAllowedCtrl) nonPrintable += 1;
  }
  return nonPrintable / text.length <= 0.1;
}

export function bytesToAuto(bytes: number[], _nonPrintable: AsciiNonPrintableMode = 'DOT'): string {
  const decoded = tryDecodeUtf8Strict(bytes);
  if (decoded && isMostlyPrintableText(decoded)) return decoded;
  return bytesToHex(bytes);
}

export function bytesToHexText(
  bytes: number[],
  nonPrintable: AsciiNonPrintableMode = 'DOT',
): { hex: string; text: string } {
  const decoded = tryDecodeUtf8Strict(bytes);
  return {
    hex: bytesToHex(bytes),
    text: decoded ?? bytesToAscii(bytes, nonPrintable),
  };
}

export function bytesToDisplay(
  bytes: number[],
  encoding: EncodingMode,
  nonPrintable: AsciiNonPrintableMode = 'DOT',
): string {
  switch (encoding) {
    case 'HEX':
      return bytesToHex(bytes);
    case 'UTF8':
      return bytesToUtf8(bytes, nonPrintable);
    case 'BASE64':
      return bytesToBase64(bytes);
    case 'AUTO':
      return bytesToAuto(bytes, nonPrintable);
    case 'HEX_TEXT': {
      const dual = bytesToHexText(bytes, nonPrintable);
      return `${dual.hex}\n${dual.text}`;
    }
    case 'ASCII':
    default:
      return bytesToAscii(bytes, nonPrintable);
  }
}

export function bytesToBase64(bytes: number[]): string {
  return btoa(String.fromCharCode(...bytes));
}

export function asciiToBytes(str: string): number[] {
  return Array.from(new TextEncoder().encode(str));
}

export function base64ToBytes(b64: string): number[] {
  try {
    const binary = atob(b64);
    return Array.from(binary, c => c.charCodeAt(0));
  } catch {
    return [];
  }
}

export function parseEscapeSequences(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\0/g, '\0')
    .replace(/\\x([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

export function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number, len = 2) => n.toString().padStart(len, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}
