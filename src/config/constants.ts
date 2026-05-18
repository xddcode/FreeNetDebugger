// ── Session / Log limits ──
export const TRAFFIC_MAX_SAMPLES = 60;
export const SEND_HISTORY_MAX = 100;
export const LOGS_CAP = 100_000;
export const LOGS_TRIM = 10_000;

// ── Traffic chart dimensions ──
export const TRAFFIC_CHART_WIDTH = 400;
export const TRAFFIC_CHART_HEIGHT = 64;

// ── Log virtualizer ──
export const LOG_VIRTUALIZER_OVERSCAN = 15;
export const LOG_ESTIMATE_SIZE = 50;
export const LOG_SCROLL_BOTTOM_THRESHOLD = 80;

// ── File flush interval (ms) ──
export const FILE_FLUSH_INTERVAL = 120;

// ── Debounce intervals ──
export const LOG_FILTER_DEBOUNCE_MS = 300;

// ── Default session config ──
export const DEFAULT_REMOTE_HOST = '127.0.0.1';
export const DEFAULT_REMOTE_PORT = 8080;
export const DEFAULT_LOCAL_PORT = 8080;
export const DEFAULT_LOCAL_HOST = '0.0.0.0';
export const DEFAULT_WS_URL = 'ws://127.0.0.1:8080';
export const DEFAULT_BAUD_RATE = 115200;

// ── Session Profiles ──
export const SESSION_PROFILES_MAX = 50;
export const SESSION_PROFILE_KEY = 'fnd-session-profiles';

// ── Persistence ──
export const STORAGE_KEY = 'fnd-store-v1';
