// ── Layout ──
export const SIDEBAR_WIDTH = '280px';
/** Chakra spacing tokens for the app title bar (tab row + window controls). */
export const APP_HEADER_HEIGHT = '12';
export const APP_HEADER_TAB_HEIGHT = '9';
export const APP_HEADER_TAB_ADD_SIZE = '9';
export const APP_HEADER_WIN_BTN_HEIGHT = '11';
/** Title-bar action cluster: icon px + Chakra button size token. */
export const APP_HEADER_ACTION_ICON_PX = 16;
export const APP_HEADER_WIN_ICON_PX = 14;
export const APP_HEADER_ACTION_BTN_SIZE = '9';

/** Unified RX/TX colors — dedicated traffic tokens, not success/accent. */
export const TRAFFIC_RX_COLOR = 'traffic-rx' as const;
export const TRAFFIC_TX_COLOR = 'traffic-tx' as const;
export const TRAFFIC_RX_SUBTLE = 'traffic-rx-subtle' as const;
export const TRAFFIC_TX_SUBTLE = 'traffic-tx-subtle' as const;
/** CSS vars for SVG sparklines (see index.css --fnd-traffic-*) */
export const TRAFFIC_RX_CSS_VAR = 'var(--fnd-traffic-rx)';
export const TRAFFIC_TX_CSS_VAR = 'var(--fnd-traffic-tx)';
export const TRAFFIC_RX_PALETTE = 'rx' as const;
export const TRAFFIC_TX_PALETTE = 'tx' as const;

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

/** Log table: time | dir | data | len */
export const LOG_TABLE_COLUMNS = '108px 44px minmax(0, 1fr) 72px';
export const LOG_TABLE_COLUMN_GAP = '12px';

// ── File flush interval (ms) ──
export const FILE_FLUSH_INTERVAL = 120;

// ── Debounce intervals ──
export const LOG_FILTER_DEBOUNCE_MS = 300;
export const CONFIG_FIELD_DEBOUNCE_MS = 300;

// ── Default session config ──
export const DEFAULT_REMOTE_HOST = '127.0.0.1';
export const DEFAULT_REMOTE_PORT = 8080;
export const DEFAULT_LOCAL_PORT = 8080;
export const DEFAULT_LOCAL_HOST = '0.0.0.0';
export const DEFAULT_WS_URL = 'ws://127.0.0.1:8080';
export const DEFAULT_BAUD_RATE = 115200;

// ── Persistence ──
export const STORAGE_KEY = 'fnd-store-v1';
