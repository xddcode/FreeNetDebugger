/** IPv4 validation: 4 octets 0-255 separated by dots */
export function isValidIPv4(ip: string): boolean {
  if (!ip || ip === '0.0.0.0') {
    return true;
  }
  const parts = ip.split('.');
  if (parts.length !== 4) {
    return false;
  }
  return parts.every(p => {
    const n = Number(p);
    return p !== '' && String(n) === p && n >= 0 && n <= 255;
  });
}

/** Port validation: 1-65535, or 0 for auto-assign */
export function isValidPort(port: number, allowZero = false): boolean {
  if (allowZero && port === 0) {
    return true;
  }
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/** WebSocket URL: must start with ws:// or wss:// */
export function isValidWsUrl(url: string): boolean {
  if (!url) {
    return false;
  }
  try {
    const u = new URL(url);
    return u.protocol === 'ws:' || u.protocol === 'wss:';
  } catch {
    return false;
  }
}
