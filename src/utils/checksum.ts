import type { ChecksumType } from '../types';

// ── CRC-8 (SM-Bus / Maxim) ──
const CRC8_TABLE = new Uint8Array(256);
{
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x80 ? (crc << 1) ^ 0x07 : crc << 1;
    }
    CRC8_TABLE[i] = crc & 0xff;
  }
}

export function crc8(data: number[]): number {
  let crc = 0x00;
  for (const byte of data) {
    crc = CRC8_TABLE[(crc ^ byte) & 0xff];
  }
  return crc;
}

// ── CRC-16 Modbus ──
export function crc16Modbus(data: number[]): number {
  let crc = 0xffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
    }
  }
  return crc;
}

// ── CRC-32 (IEEE 802.3) ──
const CRC32_TABLE = new Uint32Array(256);
{
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let b = 0; b < 8; b++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
    CRC32_TABLE[i] = crc >>> 0;
  }
}

export function crc32(data: number[]): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = (CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)) >>> 0;
  }
  return (~crc) >>> 0;
}

// ── LRC (Longitudinal Redundancy Check) ──
export function lrc(data: number[]): number {
  const sum = data.reduce((a, b) => a + b, 0);
  return ((~sum + 1) & 0xff);
}

// ── XOR ──
export function xorChecksum(data: number[]): number {
  return data.reduce((a, b) => a ^ b, 0) & 0xff;
}

// ── SUM8 ──
export function checksum8(data: number[]): number {
  return data.reduce((a, b) => a + b, 0) & 0xff;
}

// ── Dispatcher ──
export function appendChecksum(data: number[], type: ChecksumType): number[] {
  const result = [...data];
  if (type === 'CRC16') {
    const crc = crc16Modbus(data);
    result.push(crc & 0xff, (crc >> 8) & 0xff);
  } else if (type === 'CRC8') {
    result.push(crc8(data));
  } else if (type === 'CRC32') {
    const crc = crc32(data);
    result.push(
      crc & 0xff,
      (crc >> 8) & 0xff,
      (crc >> 16) & 0xff,
      (crc >> 24) & 0xff,
    );
  } else if (type === 'LRC') {
    result.push(lrc(data));
  } else if (type === 'XOR') {
    result.push(xorChecksum(data));
  } else {
    result.push(checksum8(data));
  }
  return result;
}

export function calculateChecksum(data: number[], type: ChecksumType): number | bigint {
  switch (type) {
    case 'CRC8': return crc8(data);
    case 'CRC16': return crc16Modbus(data);
    case 'CRC32': return crc32(data);
    case 'LRC': return lrc(data);
    case 'XOR': return xorChecksum(data);
    case 'SUM8': return checksum8(data);
    default: return checksum8(data);
  }
}
