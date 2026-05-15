# Codebase Structure

**Analysis Date:** 2026-05-15

## Directory Layout

```
FreeNetDebugger/
├── src/                      # React frontend source
│   ├── components/           # React UI components
│   │   ├── layout/           # App shell / layout components
│   │   ├── log/              # Data log display components
│   │   ├── send/             # Send panel and drawer components
│   │   ├── sidebar/          # Connection configuration sidebar
│   │   ├── status/           # Status bar component
│   │   ├── traffic/          # Traffic chart component
│   │   ├── scripts/          # (reserved) Script panel components
│   │   ├── AboutDialog.tsx   # About modal dialog
│   │   └── ...               # Future top-level components
│   ├── config/               # App constants and config
│   ├── i18n/                 # Internationalization
│   │   └── locales/          # Translation files (en, zh-CN)
│   ├── store/                # Zustand state management
│   ├── types/                # TypeScript type definitions
│   ├── utils/                # Pure utility functions
│   ├── App.tsx               # Root component (event listeners, data buffering)
│   ├── main.tsx              # Entry point (React root, i18n init, splash)
│   ├── index.css             # Global styles, Tailwind theme, custom CSS
│   └── vite-env.d.ts         # Vite environment types
├── src-tauri/                # Rust backend (Tauri v2)
│   ├── src/                  # Rust source files
│   │   ├── main.rs           # Binary entry point
│   │   ├── lib.rs            # Library entry (Tauri builder, handlers)
│   │   ├── commands.rs       # Tauri invoke commands
│   │   ├── protocols.rs      # Network protocol implementations
│   │   ├── events.rs         # Event emission to frontend
│   │   ├── state.rs          # App state (connection map)
│   │   ├── types.rs          # Rust data types
│   │   └── utils.rs          # Rust utilities (buffer sizes, timestamps)
│   ├── Cargo.toml            # Rust dependencies
│   └── tauri.conf.json       # Tauri app configuration
├── public/                   # Static assets (app-icon.png, etc.)
├── dist/                     # Vite build output (gitignored)
├── index.html                # HTML entry point with splash screen
├── package.json              # Node dependencies and scripts
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript configuration
├── tsconfig.node.json        # TS config for Vite/Node tooling
├── eslint.config.mjs         # ESLint configuration
└── bun.lock                  # Bun lockfile
```

## Directory Purposes

**`src/components/`:**
- Purpose: All React UI components
- Contains: `.tsx` files, one default export per file
- Key files: `layout/AppLayout.tsx`, `log/DataLog.tsx`, `send/DataSend.tsx`, `sidebar/ConnectionPanel.tsx`

**`src/components/layout/`:**
- Purpose: Top-level layout and shell components
- Contains: `AppLayout.tsx` (main app shell with header, tabs, panels)

**`src/components/log/`:**
- Purpose: Log display and filtering
- Contains: `DataLog.tsx` (virtualized log viewer with search)

**`src/components/send/`:**
- Purpose: Send functionality and send hub
- Contains: `DataSend.tsx` (send input), `SendCenterDrawer.tsx` (history/shortcuts drawer)

**`src/components/sidebar/`:**
- Purpose: Left sidebar configuration panels
- Contains: `ConnectionPanel.tsx` (protocol, network, receive, send settings)

**`src/components/status/`:**
- Purpose: Bottom status bar
- Contains: `StatusBar.tsx` (connection status, RX/TX counters)

**`src/components/traffic/`:**
- Purpose: Traffic visualization
- Contains: `TrafficChart.tsx` (SVG sparkline chart + stats)

**`src/components/scripts/`:**
- Purpose: Reserved for future script panel (PRO feature)
- Contains: Empty (placeholder for protocol parser scripts)

**`src/config/`:**
- Purpose: App-level constants
- Contains: `app.ts` (name, version, description, URLs)

**`src/i18n/`:**
- Purpose: Translation infrastructure
- Contains: `index.ts` (i18next setup), `locales/en.ts`, `locales/zh-CN.ts`

**`src/store/`:**
- Purpose: Global state management
- Contains: `index.ts` (Zustand store with Immer + Persist)

**`src/types/`:**
- Purpose: Shared TypeScript interfaces
- Contains: `index.ts` (all domain types: Session, LogEntry, ProtocolType, etc.)

**`src/utils/`:**
- Purpose: Pure helper functions
- Contains: `encoding.ts`, `checksum.ts`, `tauri.ts`, `sendPanelBus.ts`

**`src-tauri/src/`:**
- Purpose: Rust backend source
- Contains: Commands, protocols, events, state management

## Key File Locations

**Entry Points:**
- `src/main.tsx`: Frontend bootstrap (React root, i18n, splash)
- `src-tauri/src/main.rs`: Rust binary entry
- `src-tauri/src/lib.rs`: Rust library entry (Tauri app builder)
- `index.html`: HTML shell with startup splash

**Configuration:**
- `vite.config.ts`: Vite + React + TailwindCSS plugin setup
- `tsconfig.json`: TypeScript strict mode, ES2020, React JSX
- `eslint.config.mjs`: ESLint with React hooks and refresh rules
- `src-tauri/tauri.conf.json`: Tauri window config (frameless, 1280x820)
- `src-tauri/Cargo.toml`: Rust deps (tauri v2, tokio, tokio-tungstenite, serialport)

**Core Logic:**
- `src/App.tsx`: Event listener setup, data buffering, traffic sampling
- `src/store/index.ts`: All state mutations (300 lines)
- `src-tauri/src/protocols.rs`: All network I/O (TCP/UDP/WebSocket)
- `src-tauri/src/commands.rs`: Frontend-to-Rust command handlers

**Testing:**
- Not detected. No test files, no test config (jest/vitest/playwright).

## Naming Conventions

**Files:**
- Components: PascalCase matching component name — `DataLog.tsx`, `AppLayout.tsx`
- Utils/Config/Store: camelCase — `sendPanelBus.ts`, `app.ts`, `index.ts`
- Rust modules: snake_case — `commands.rs`, `protocols.rs`

**Directories:**
- kebab-case or lowercase — `src-tauri/`, `i18n/`, `locales/`

**Components:**
- Default export function with matching filename
- Props interface named `Props` (not prefixed with component name)
- Internal helper components defined in same file (e.g., `PanelCard`, `FieldLabel` in `ConnectionPanel.tsx`)

**Types:**
- TypeScript: PascalCase with descriptive names — `ConnectionConfig`, `LogEntry`, `TrafficSample`
- Rust: PascalCase structs — `ConnectionConfig`, `DataEvent`, `StatusEvent`

**Functions:**
- camelCase — `bytesToDisplay`, `handleConnect`, `doSend`
- Rust: snake_case — `spawn_connection_task`, `emit_data`

**CSS Classes:**
- Tailwind utilities preferred
- Custom classes use kebab-case — `neon-card`, `btn-interactive`, `field-control`

## Where to Add New Code

**New Feature (e.g., new protocol):**
- Frontend protocol type: Add to `src/types/index.ts` `ProtocolType` union
- Frontend protocol UI: Update `ConnectionPanel.tsx` protocol select and conditional fields
- Rust protocol implementation: Add branch in `src-tauri/src/protocols.rs` `spawn_connection_task`
- Rust command: Already generic (`connect` takes protocol string), no new command needed

**New Component:**
- Implementation: `src/components/{category}/NewComponent.tsx`
- Import in: `AppLayout.tsx` or appropriate parent
- Types: If shared, add to `src/types/index.ts`

**New Utility Function:**
- Shared helpers: `src/utils/{name}.ts`
- Import pattern: `import { fn } from '../../utils/{name}'`

**New Translation Keys:**
- Add to `src/i18n/locales/en.ts` first (source of truth for `Translations` type)
- Mirror in `src/i18n/locales/zh-CN.ts`

**New Store Action:**
- Add to `AppState` interface in `src/store/index.ts`
- Implement in the `immer((set) => ({ ... }))` object
- Update `PersistedState` and `partialize` if the new field should be persisted

**New Rust Command:**
- Add function in `src-tauri/src/commands.rs` with `#[tauri::command]` attribute
- Register in `src-tauri/src/lib.rs` `generate_handler![]` macro

## Special Directories

**`dist/`:**
- Purpose: Vite production build output
- Generated: Yes (by `vite build`)
- Committed: No (gitignored)

**`node_modules/`:**
- Purpose: Node.js dependencies
- Generated: Yes (by `bun install`)
- Committed: No (gitignored)

**`src-tauri/target/`:**
- Purpose: Rust build artifacts
- Generated: Yes (by `cargo build`)
- Committed: No (gitignored)

**`public/`:**
- Purpose: Static assets served at root
- Contains: `app-icon.png`
- Committed: Yes

**`.planning/`:**
- Purpose: GSD planning documents
- Contains: `codebase/*.md` analysis documents
- Committed: Yes

---

*Structure analysis: 2026-05-15*
