# External Integrations

**Analysis Date:** 2026-05-15

## APIs & External Services

**No external cloud APIs or SaaS services are integrated.**

This is a fully offline desktop network debugging tool. All network operations are peer-to-peer or direct socket connections initiated by the user.

**Network Protocols Supported (user-initiated connections):**
- TCP Client - Outbound TCP connections to user-specified hosts/ports (`src-tauri/src/protocols.rs`)
- TCP Server - Inbound TCP listener on user-specified local ports (`src-tauri/src/protocols.rs`)
- UDP Client/Server - UDP socket I/O (`src-tauri/src/protocols.rs`)
- WebSocket Client - Outbound WebSocket connections via `tokio-tungstenite` (`src-tauri/src/protocols.rs`)
- Serial Port - Local serial port communication via `serialport` crate (`src-tauri/src/commands.rs`)

**External Resource Loading:**
- Google Fonts - `Space Grotesk` and `JetBrains Mono` loaded from `fonts.googleapis.com` in `index.html`
  - File: `index.html` line 8
  - Note: Requires internet connectivity on first launch for font loading; no local font fallback mechanism documented

## Data Storage

**Databases:**
- None. No database is used.

**Local Persistence:**
- `localStorage` - Used by Zustand persist middleware for app state storage
  - Key: `fnd-store-v1`
  - Stores: session configs, receive/send settings, quick commands, locale preference, send history, send content
  - Does NOT store: logs, traffic samples, byte counters (ephemeral data stripped via `partialize`)
  - File: `src/store/index.ts`

**File Storage:**
- Local filesystem via Tauri APIs (indirect - no explicit file read/write commands in Rust backend)
- The `saveToFile` receive setting exists in types (`src/types/index.ts`) but no file system write implementation is present in the Rust backend

**Caching:**
- None beyond browser localStorage for state persistence

## Authentication & Identity

**Auth Provider:**
- None. No authentication system is implemented.

This is a single-user desktop application with no user accounts, login, or identity management.

## Monitoring & Observability

**Error Tracking:**
- None. No Sentry, Rollbar, or similar service integrated.

**Logs:**
- Rust: `log` crate facade is a dependency but no logger implementation is configured (`env_logger` not present)
- Frontend: Console logging is discouraged by ESLint (`no-console: warn` with `allow: ['warn', 'error']`)
- Application logs: Network traffic and system events are displayed in the UI (`DataLog` component) but not persisted to disk

## CI/CD & Deployment

**Hosting:**
- GitHub Releases (intended, based on `APP.github` config in `src/config/app.ts`)
- Gitee mirror (`APP.gitee` in `src/config/app.ts`)

**CI Pipeline:**
- None detected. No `.github/workflows/`, `.gitlab-ci.yml`, or similar CI configuration present.

**Build Process:**
- Local build via `bun run tauri build`
- Tauri bundles for all platforms (`targets: "all"` in `tauri.conf.json`)

## Tauri Plugins & Permissions

**Installed Plugins:**
- `tauri-plugin-opener` v2 - Opens URLs in system default browser
  - Used in: `src/components/layout/AppLayout.tsx` via `openUrl()` from `@tauri-apps/plugin-opener`
  - Permission: `opener:default` in `src-tauri/capabilities/default.json`

**Core Permissions (`src-tauri/capabilities/default.json`):**
- `core:default` - Base Tauri permissions
- `core:window:allow-start-dragging` - Custom title bar drag support (frameless window)
- `core:window:allow-close` - Window close
- `core:window:allow-minimize` - Window minimize
- `core:window:allow-maximize` - Window maximize
- `core:window:allow-toggle-maximize` - Window maximize toggle

**Tauri Commands (Rust → Frontend bridge):**
- `connect` - Establish a network/serial connection (`src-tauri/src/commands.rs`)
- `disconnect` - Tear down a connection (`src-tauri/src/commands.rs`)
- `send_data` - Send bytes over an active connection (`src-tauri/src/commands.rs`)
- `list_serial_ports` - Enumerate available serial ports (`src-tauri/src/commands.rs`)
- `exit_app` - Gracefully terminate the application (`src-tauri/src/commands.rs`)

**Tauri Events (Rust → Frontend push):**
- `net:data` - Incoming data payload with bytes, direction, source, timestamp (`src-tauri/src/events.rs`)
- `net:status` - Connection status changes (connecting, connected, error, disconnected, etc.) (`src-tauri/src/events.rs`)

## Environment Configuration

**Required env vars:**
- `TAURI_DEV_HOST` (optional) - Enables HMR with WebSocket host binding during development
  - Used in: `vite.config.ts`

**No other environment variables are required.** The application is fully self-contained.

**Secrets location:**
- Not applicable. No API keys, tokens, or secrets are used.

## Webhooks & Callbacks

**Incoming:**
- None. The application does not expose any HTTP endpoints or webhook receivers.

**Outgoing:**
- None. No webhook subscriptions or outbound callbacks to external services.

## External Fonts

**Google Fonts CDN:**
- `Space Grotesk` (weights 300-700) - Primary display font
- `JetBrains Mono` (weights 400-500) - Monospace font for data/code display
- Loaded via `<link>` in `index.html`
- Fallbacks defined in CSS custom properties: `system-ui, sans-serif` and `'Consolas', monospace`

---

*Integration audit: 2026-05-15*
