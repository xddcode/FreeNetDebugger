import { describe, it, expect } from 'vitest';
import { isValidIPv4, isValidPort, isValidWsUrl } from './validation';

describe('isValidIPv4', () => {
  it('accepts valid IPv4 addresses', () => {
    expect(isValidIPv4('127.0.0.1')).toBe(true);
    expect(isValidIPv4('192.168.1.1')).toBe(true);
    expect(isValidIPv4('0.0.0.0')).toBe(true);
    expect(isValidIPv4('255.255.255.255')).toBe(true);
  });
  it('accepts empty string', () => {
    expect(isValidIPv4('')).toBe(true);
  });
  it('rejects invalid IPv4 addresses', () => {
    expect(isValidIPv4('256.1.1.1')).toBe(false);
    expect(isValidIPv4('192.168.1')).toBe(false);
    expect(isValidIPv4('192.168.1.1.1')).toBe(false);
    expect(isValidIPv4('abc.def.ghi.jkl')).toBe(false);
    expect(isValidIPv4('192.168.01.01')).toBe(false); // leading zeros not preserved
  });
});

describe('isValidPort', () => {
  it('accepts valid ports', () => {
    expect(isValidPort(1)).toBe(true);
    expect(isValidPort(8080)).toBe(true);
    expect(isValidPort(65535)).toBe(true);
  });
  it('rejects invalid ports', () => {
    expect(isValidPort(0)).toBe(false);
    expect(isValidPort(65536)).toBe(false);
    expect(isValidPort(-1)).toBe(false);
    expect(isValidPort(3.14)).toBe(false);
  });
  it('allows zero when allowZero is true', () => {
    expect(isValidPort(0, true)).toBe(true);
    expect(isValidPort(0, false)).toBe(false);
  });
});

describe('isValidWsUrl', () => {
  it('accepts valid ws:// URLs', () => {
    expect(isValidWsUrl('ws://localhost:8080')).toBe(true);
    expect(isValidWsUrl('ws://127.0.0.1:8080/path')).toBe(true);
  });
  it('accepts valid wss:// URLs', () => {
    expect(isValidWsUrl('wss://example.com/socket')).toBe(true);
  });
  it('rejects invalid WebSocket URLs', () => {
    expect(isValidWsUrl('http://example.com')).toBe(false);
    expect(isValidWsUrl('https://example.com')).toBe(false);
    expect(isValidWsUrl('ftp://example.com')).toBe(false);
    expect(isValidWsUrl('')).toBe(false);
    expect(isValidWsUrl('not-a-url')).toBe(false);
  });
});
