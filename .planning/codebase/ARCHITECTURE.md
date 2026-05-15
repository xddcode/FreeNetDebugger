<!-- refreshed: 2026-05-15 -->
# Architecture

**Analysis Date:** 2026-05-15

## System Overview

FreeNetDebugger is a Tauri v2 desktop application with a React frontend and a Rust/Tokio backend. It is a multi-session network debugging tool supporting TCP (client/server), UDP (client/server), WebSocket, and serial port protocols.

```text
+-------------------------------------------------------------+
|                      React UI Layer                          |
|  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  |
|  │   AppLayout  │  │  DataLog     │  │  ConnectionPanel  │  |
|  │`components/  │  │`components/  │  │`components/       │  |
|  │  layout`     │  │  log`        │  │  sidebar`         │  |
|  └──────┬───────┘  └──────┬───────┘  └─────────┬─────────┘  |
|         │                 │                     │            |
|  ┌──────┴───────┐  ┌──────┴───────┐  ┌─────────┴─────────┐  |
|  │  DataSend    │  │TrafficChart  │  │ SendCenterDrawer  │  |
|  │`components/  │  │`components/  │  │`components/send`  │  |
|  │  send`       │  │  traffic`    │  │                   │  |
|  └──────┬───────┘  └──────────────┘  └───────────────────┘  |
+---------┼---------------------------------------------------+
          │
          ▼
+-------------------------------------------------------------+
|                    Zustand Store Layer                       |
|              `src/store/index.ts`                            |
|  - Session state (config, logs, traffic, history)            |
|  - UI state (active session, locale, log filter)             |
|  - Persisted to localStorage (immer + persist middleware)    |
+---------┼---------------------------------------------------+
          │
          ▼
+-------------------------------------------------------------+
|                 Tauri Bridge Layer                           |
|              `src/utils/tauri.ts`                            |
|  - Safe invoke wrapper (fails gracefully outside Tauri)      |
|  - Event listeners: `net:data`, `net:status`                 |
+---------┼---------------------------------------------------+
          │
          ▼
+-------------------------------------------------------------+
|                   Rust Backend Layer                         |
|              `src-tauri/src/`                                |
|  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  |
|  │   commands   │  │   protocols  │  │      events       │  |
|  │  (invoke)    │  │  (async I/O) │  │  (emit to front)  │  |
|  └──────────────┘  └──────────────┘  └───────────────────┘  |
+-------------------------------------------------------------+
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `App` | Root component. Sets up Tauri event listeners, buffers incoming data, flushes to store, computes traffic samples | `src/App.tsx` |
| `AppLayout` | Main layout shell. Header (title bar, window controls), session tabs, sidebar, main content area, status bar | `src/components/layout/AppLayout.tsx` |
| `ConnectionPanel` | Sidebar network configuration. Protocol selector, host/port fields, connect/disconnect button, receive/send settings | `src/components/sidebar/ConnectionPanel.tsx` |
| `DataLog` | Virtualized log display. Uses TanStack Virtual for 100K+ entries, search filter, auto-scroll | `src/components/log/DataLog.tsx` |
| `DataSend` | Send input area. Textarea with encoding toggle, file open, periodic send, checksum auto-append | `src/components/send/DataSend.tsx` |
| `SendCenterDrawer` | Right-side drawer. Send history, quick shortcuts (starred commands), scripts placeholder | `src/components/send/SendCenterDrawer.tsx` |
| `TrafficChart` | SVG sparkline chart + stats. RX/TX rate visualization with 60-sample rolling window | `src/components/traffic/TrafficChart.tsx` |
| `StatusBar` | Bottom status bar. Connection status, address, RX/TX byte counters | `src/components/status/StatusBar.tsx` |
| `AboutDialog` | Modal about dialog with app info and GitHub link | `src/components/AboutDialog.tsx` |

## Pattern Overview

**Overall:** Event-driven layered architecture with a central Zustand store.

**Key Characteristics:**
- Single global store (Zustand + Immer + Persist) owns all session state
- Tauri event bridge decouples Rust async I/O from React rendering
- High-throughput data buffering in `App.tsx` (80ms flush interval) prevents render thrashing
- Virtualized list rendering (`@tanstack/react-virtual`) handles 100K+ log entries
- Per-session isolation: each session has independent config, logs, traffic, and send history

## Layers

**Presentation Layer:**
- Purpose: Render UI, handle user interactions
- Location: `src/components/`
- Contains: React functional components, inline styles + Tailwind classes
- Depends on: Zustand store (`useAppStore`), i18n (`useTranslation`), Tauri utils
- Used by: ReactDOM root in `main.tsx`

**State Management Layer:**
- Purpose: Centralized reactive state with persistence
- Location: `src/store/index.ts`
- Contains: Zustand store definition, session CRUD, log append, traffic sampling
- Depends on: Types from `src/types/index.ts`, Zustand + Immer + persist middleware
- Used by: All components via `useAppStore` hook

**Type Definitions Layer:**
- Purpose: Shared TypeScript interfaces
- Location: `src/types/index.ts`
- Contains: `Session`, `LogEntry`, `TrafficSample`, `ConnectionConfig`, `ProtocolType`, Tauri event types
- Depends on: Nothing
- Used by: Store, components, utils

**Utility Layer:**
- Purpose: Pure helper functions and bridge wrappers
- Location: `src/utils/`
- Contains: Encoding/decoding (`encoding.ts`), checksum (`checksum.ts`), Tauri invoke wrapper (`tauri.ts`), event bus (`sendPanelBus.ts`)
- Depends on: Types
- Used by: Components, store consumers

**Tauri Bridge Layer:**
- Purpose: Safe communication with Rust backend
- Location: `src/utils/tauri.ts`
- Contains: `invoke()` wrapper, `isTauri()` runtime check
- Depends on: `@tauri-apps/api/core`
- Used by: `ConnectionPanel`, `DataSend`, `AppLayout`

**Backend Command Layer (Rust):**
- Purpose: Expose Rust functions to frontend via Tauri invoke
- Location: `src-tauri/src/commands.rs`
- Contains: `connect`, `disconnect`, `send_data`, `list_serial_ports`, `exit_app`
- Depends on: `AppState`, `protocols`, `events`
- Used by: Frontend via Tauri invoke

**Backend Protocol Layer (Rust):**
- Purpose: Async network I/O for all supported protocols
- Location: `src-tauri/src/protocols.rs`
- Contains: `spawn_connection_task` — TCP client/server, UDP client/server, WebSocket
- Depends on: Tokio, `tokio-tungstenite`, `AppHandle`, `events`
- Used by: `commands::connect`

**Backend Event Layer (Rust):**
- Purpose: Emit events from Rust to frontend
- Location: `src-tauri/src/events.rs`
- Contains: `emit_data`, `emit_status` — serializes to `DataEvent`/`StatusEvent`
- Depends on: Tauri `Emitter` trait
- Used by: Protocol tasks

## Data Flow

### Primary Request Path (Connect -> Send -> Receive)

1. User clicks Connect in `ConnectionPanel` (`src/components/sidebar/ConnectionPanel.tsx:88`)
2. `ConnectionPanel` calls `invoke('connect', { id, config })` via `src/utils/tauri.ts:13`
3. Rust `commands::connect` (`src-tauri/src/commands.rs:11`) spawns a protocol task
4. Protocol task (`src-tauri/src/protocols.rs:14`) opens socket, emits `net:status` events
5. `App.tsx` listens to `net:status` (`src/App.tsx:59`), maps status, updates store
6. User types data in `DataSend`, clicks Send
7. `DataSend` calls `invoke('send_data', { id, data })` (`src/components/send/DataSend.tsx:73`)
8. Rust `commands::send_data` forwards data to the connection's mpsc channel
9. Protocol task sends data over the wire, emits `net:data` with direction `'send'`
10. Incoming data triggers `net:data` event; `App.tsx` buffers it (`src/App.tsx:60`)
11. 80ms flush timer drains buffer into Zustand store (`src/App.tsx:109`)
12. `DataLog` virtualizer re-renders visible rows from store (`src/components/log/DataLog.tsx:144`)

### Traffic Sampling Flow

1. `App.tsx` runs a 1-second interval timer (`src/App.tsx:146`)
2. Each tick reads `rxBytes`/`txBytes` from all sessions in store
3. Computes rate = delta / 1s, appends `TrafficSample` to session
4. `TrafficChart` reads `trafficSamples` array, renders SVG sparklines
5. Store caps samples at 60 (1 minute of history) — `src/store/index.ts:10`

### Send Center Communication Flow

1. `SendCenterDrawer` user clicks "Fill" or "Send Now" on a history/shortcut item
2. `SendCenterDrawer` calls `sendPanelBus.emit(text, encoding, sendNow)` (`src/utils/sendPanelBus.ts:5`)
3. `DataSend` subscribes to the bus (`src/components/send/DataSend.tsx:82`)
4. Bus callback updates send content and optionally triggers `doSend()`

## Key Abstractions

**Session:**
- Purpose: Represents one network connection with full state
- Examples: `src/types/index.ts:115`
- Pattern: Flat data structure with nested config/settings objects

**LogEntry:**
- Purpose: Immutable record of a single data packet or system message
- Examples: `src/types/index.ts:61`
- Pattern: `id` (auto-increment), `timestamp`, `direction`, `data` (number[] for byte array)

**Zustand Store with Immer:**
- Purpose: Mutable-draft state updates with immutable output
- Examples: `src/store/index.ts:99`
- Pattern: `immer((set) => ({ ...actions }))` — actions use direct mutation on draft

**Tauri Event Bridge:**
- Purpose: Decouple Rust async runtime from React sync render cycle
- Examples: `src-tauri/src/events.rs`, `src/App.tsx:59`
- Pattern: Rust emits named events (`net:data`, `net:status`); frontend uses `@tauri-apps/api/event.listen()`

## Entry Points

**Frontend Entry:**
- Location: `src/main.tsx`
- Triggers: Browser/Tauri WebView loads `index.html`
- Responsibilities: Create React root, import i18n, apply persisted locale, render `<App />`, hide splash screen

**Backend Entry:**
- Location: `src-tauri/src/main.rs`
- Triggers: Tauri runtime starts the Rust process
- Responsibilities: Call `freenetdebugger_lib::run()`

**Library Entry:**
- Location: `src-tauri/src/lib.rs`
- Triggers: Called by `main.rs`
- Responsibilities: Build Tauri app, register invoke handlers, manage `AppState`, run event loop

## Architectural Constraints

- **Threading:** Rust uses Tokio async runtime (multi-threaded). Each connection spawns its own Tokio task. Frontend is single-threaded JavaScript event loop.
- **Global state:** Single Zustand store instance created at module load (`src/store/index.ts:99`). Store is module-level singleton.
- **Circular imports:** None detected. Components import from store, types, and utils. Utils only import from types.
- **Data volume:** Log cap is 100,000 entries with 10,000-entry trim (`src/store/index.ts:12`). Traffic samples capped at 60 (`src/store/index.ts:10`). Send history capped at 100 (`src/store/index.ts:11`).
- **Persistence:** Only config/settings persisted to localStorage. Ephemeral data (logs, traffic, byte counts) is stripped on save (`src/store/index.ts:278`).
- **Tauri dependency:** App requires Tauri runtime. `invoke()` throws outside Tauri (`src/utils/tauri.ts:14`).

## Anti-Patterns

### Inline Style Objects

**What happens:** Many components define large inline style objects directly in JSX (e.g., `AppLayout.tsx` has 50+ inline style objects).
**Why it's wrong:** Hard to maintain, no CSS class reuse, harder to theme, bloats component code.
**Do this instead:** Extract reusable style objects to constants at module level, or use Tailwind utility classes where possible. For theme tokens, use CSS custom properties (already defined in `src/index.css`).

### Direct Store Access Inside Callbacks

**What happens:** Some closures read `useAppStore.getState()` inside event handlers (e.g., `ConnectionPanel.tsx:112`, `DataSend.tsx:90`).
**Why it's wrong:** Can lead to stale closures if not carefully managed. Zustand's `getState()` bypasses React's render cycle.
**Do this instead:** Use Zustand selectors for reactive reads. For one-shot reads inside callbacks, `getState()` is acceptable but document the intent.

## Error Handling

**Strategy:** Errors are logged as system-direction `LogEntry` records. Rust errors are emitted as `net:status` events with `status: "error"`. Frontend catches invoke errors and appends log entries.

**Patterns:**
- Rust commands return `Result<(), String>` — errors propagate to frontend as exceptions
- Frontend wraps `invoke()` in try/catch, appends error text to logs (`ConnectionPanel.tsx:102`)
- Tauri event listener unregistration uses `.then(f => f())` pattern (`App.tsx:85`)

## Cross-Cutting Concerns

**Logging:** No external logging framework. System messages appended to session logs as `LogEntry` with `direction: 'system'`.
**Validation:** Minimal. Port fields use `type="number"` inputs. Hex validation in `hexToBytes()` returns empty array on invalid input.
**Authentication:** Not applicable — this is a local desktop network tool with no user auth.
**i18n:** react-i18next with two locales (en, zh-CN). Translation keys are nested objects. Type safety via `Translations` type derived from English source (`src/i18n/locales/en.ts:144`).

---

*Architecture analysis: 2026-05-15*
