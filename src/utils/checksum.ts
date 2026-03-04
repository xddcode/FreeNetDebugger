import type { ChecksumType } from '../types';

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

export function lrc(data: number[]): number {
  const sum = data.reduce((a, b) => a + b, 0);
  return ((~sum + 1) & 0xff);
}

export function checksum8(data: number[]): number {
  return data.reduce((a, b) => a + b, 0) & 0xff;
}

export function appendChecksum(data: number[], type: ChecksumType): number[] {
  const result = [...data];
  if (type === 'CRC16') {
    const crc = crc16Modbus(data);
    result.push(crc & 0xff, (crc >> 8) & 0xff);
  } else if (type === 'LRC') {
    result.push(lrc(data));
  } else {
    result.push(checksum8(data));
  }
  return result;
}
