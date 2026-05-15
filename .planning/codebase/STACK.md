# Technology Stack

**Analysis Date:** 2026-05-15

## Languages

**Primary:**
- TypeScript 5.8.3 - Frontend application code (`src/**/*.ts`, `src/**/*.tsx`)
- Rust 2021 Edition - Tauri backend/native layer (`src-tauri/src/**/*.rs`)
- CSS - Styling with Tailwind CSS v4 directives (`src/index.css`)

**Secondary:**
- HTML - Entry point template (`index.html`)
- JSON - Configuration files (`tsconfig.json`, `tauri.conf.json`, etc.)
- TOML - Rust package manifest (`src-tauri/Cargo.toml`)

## Runtime

**Frontend Environment:**
- Chromium/WebView2 via Tauri v2 (embedded webview)
- React 19.1.0 on DOM

**Backend Environment:**
- Native OS process via Tauri v2 Rust runtime
- Tokio async runtime (`tokio` v1 with `full` features) for async I/O

**Package Manager:**
- Bun (inferred from `bun.lock` lockfile and `bun run` scripts in `tauri.conf.json`)
- Lockfile: `bun.lock` present

**Build Tool:**
- Vite 7.0.4 - Frontend bundler and dev server
- Tauri CLI v2 - Native app bundler and dev runner
- Cargo - Rust package manager and compiler

## Frameworks

**Core:**
- Tauri v2 - Cross-platform desktop app framework (Rust backend + web frontend)
- React 19.1.0 - UI component library
- React DOM 19.1.0 - React DOM renderer

**State Management:**
- Zustand 5.0.11 with Immer middleware and persist middleware - Global state store (`src/store/index.ts`)

**Internationalization:**
- i18next 25.8.14 - Translation framework
- react-i18next 16.5.4 - React bindings for i18next

**Styling:**
- Tailwind CSS 4.2.1 - Utility-first CSS framework
- `@tailwindcss/vite` 4.2.1 - Vite plugin for Tailwind CSS v4

**Virtualization:**
- `@tanstack/react-virtual` 3.13.19 - Virtual list rendering for high-throughput log display (`src/components/log/DataLog.tsx`)

**Icons:**
- lucide-react 0.576.0 - Icon library

**Build/Dev:**
- Vite 7.0.4 with `@vitejs/plugin-react` 4.6.0 - Dev server and bundler
- TypeScript 5.8.3 - Type checking
- ESLint 10.0.2 with TypeScript and React plugins - Linting
- PostCSS 8.5.8 + Autoprefixer 10.4.27 - CSS processing

## Key Dependencies

**Frontend Critical:**
- `@tauri-apps/api` v2 - Tauri JavaScript API for invoking Rust commands and listening to events
- `@tauri-apps/plugin-opener` v2 - URL opening plugin (used in `AppLayout.tsx` for `openUrl`)
- `zustand` 5.0.11 - Lightweight state management with persistence to `localStorage`
- `immer` 11.1.4 - Immutable state updates via Zustand middleware

**Backend Critical:**
- `tauri` v2 - Core Tauri framework (Rust)
- `tauri-plugin-opener` v2 - Rust-side opener plugin
- `tokio` v1 (full features) - Async runtime for TCP/UDP/WebSocket/serial I/O
- `tokio-tungstenite` 0.26 (native-tls) - WebSocket client implementation
- `serialport` 4 - Serial port enumeration and access
- `futures-util` 0.3 - Async stream/sink utilities for WebSocket handling
- `serde` / `serde_json` - Serialization for Tauri command payloads
- `log` 0.4 - Rust logging facade

**Infrastructure:**
- `tauri-build` v2 - Build-time Tauri code generation

## Configuration

**TypeScript:**
- `tsconfig.json` - Frontend TS config: ES2020 target, ESNext modules, React JSX, strict mode, bundler resolution
- `tsconfig.node.json` - Vite config TS config (referenced)

**Vite:**
- `vite.config.ts` - Dev server on port 1420, HMR on port 1421 (when `TAURI_DEV_HOST` set), ignores `src-tauri` in watch

**Tauri:**
- `src-tauri/tauri.conf.json` - App config: product name "FreeNetDebugger", version 1.0.0, window 1280x820, frameless (`decorations: false`)
- `src-tauri/Cargo.toml` - Rust package: name `freenetdebugger`, edition 2021
- `src-tauri/capabilities/default.json` - Permission manifest: window controls (drag, close, minimize, maximize), opener plugin

**ESLint:**
- `eslint.config.mjs` - Flat config: TypeScript recommended, React Hooks, React Refresh, custom rules (`no-console` warn, `eqeqeq` error, `curly` error, consistent type imports)

**Styling:**
- `src/index.css` - Tailwind v4 `@import "tailwindcss"` with custom `@theme` variables (colors, fonts, transitions)
- No separate `tailwind.config.js` — configuration is CSS-based (Tailwind v4 style)

**Environment:**
- No `.env` file detected in repo
- `TAURI_DEV_HOST` environment variable optionally enables HMR host mode

## Platform Requirements

**Development:**
- Bun runtime for package management and script execution
- Rust toolchain (cargo) for Tauri backend compilation
- Node.js-compatible environment (Vite dev server)
- Platform-specific Tauri prerequisites:
  - Windows: WebView2, MSVC build tools
  - macOS: Xcode CLI tools
  - Linux: WebKit2GTK, build essentials

**Production:**
- Desktop deployment via Tauri bundler
- Targets: Windows (.msi, .exe), macOS (.dmg, .app), Linux (.deb, .AppImage)
- No server-side deployment — fully offline desktop application

---

*Stack analysis: 2026-05-15*
