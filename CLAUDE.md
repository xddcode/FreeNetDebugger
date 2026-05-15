# FreeNetDebugger

## Overview

A modern, general-purpose network debugging desktop tool built with Tauri v2 and React. It supports multiple protocols (TCP, UDP, WebSocket, Serial, HTTP), user scripting for automation, and custom data parsing.

## Tech Stack

- **Frontend:** React 19 + TypeScript 5.8 + Tailwind CSS 4 + Zustand 5
- **Backend:** Rust (Tauri v2) + Tokio async runtime
- **Build:** Vite 7 + Bun + Cargo
- **Testing:** vitest (to be added)

## Key Patterns

### State Management
- Use domain-specific Zustand stores (`sessionStore`, `logStore`, `settingsStore`, `scriptStore`)
- Do NOT add to the monolithic store in `src/store/index.ts` — it is being phased out
- New features get their own store file in `src/store/`

### Styling
- Use Tailwind CSS utility classes
- Use CSS custom properties (`--color-*`, `--spacing-*`) for theme values
- Do NOT use inline `style={{ ... }}` objects
- New components must work in both light and dark themes

### Protocol Abstraction
- All connection types implement the `ProtocolHandler` trait in Rust
- Frontend treats all connections uniformly via the session store
- New protocols add a Rust handler + frontend config form

### Scripting
- User scripts run in QuickJS sandbox (no filesystem access)
- Script API: `send(data)`, `onReceive(callback)`, `log(message)`, `sleep(ms)`
- Scripts are associated with sessions, saved to localStorage

## Architecture

```
React UI Layer
    ↓
Domain Stores (Zustand)
    ↓
Tauri Bridge (invoke/events)
    ↓
Rust Backend (Protocol Router → Handlers)
```

## Project Conventions

- Components: one default export per file, PascalCase
- Hooks: `use{Feature}.ts`, camelCase
- Stores: `{domain}Store.ts`
- Services: `{feature}Service.ts` — thin wrappers around Tauri invoke
- Utils: pure functions, testable
- Types: shared types in `src/types/index.ts`
- i18n: ALL user-facing strings must use `t('key')` — never hardcode

## Development Commands

```bash
# Dev server
bun run dev

# Build
bun run build

# Tauri dev
bun run tauri dev

# Lint
bun run lint
```

## Current Phase

Phase 1: Design System + Theme — establishing the visual foundation.

See `.planning/ROADMAP.md` for full phase breakdown.

## Out of Scope (v1)

- Mobile app, web version, cloud sync
- Packet capture (pcap), gRPC, BLE
- Plugin/extension system
- Built-in SSH terminal

## Important Notes

- This is a brownfield project — existing code works for TCP/UDP/WebSocket
- Serial port UI exists but backend is stubbed
- Scripts tab shows "Coming soon" placeholder
- Store is monolithic and needs splitting (Phase 2)
- Zero tests currently — adding test infrastructure is Phase 3
