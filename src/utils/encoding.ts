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

export function bytesToAscii(bytes: number[]): string {
  return bytes.map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.').join('');
}

export function bytesToUtf8(bytes: number[]): string {
  try {
    return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
  } catch {
    return bytesToAscii(bytes);
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
