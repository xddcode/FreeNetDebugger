# FreeNetDebugger

## What This Is

A modern, general-purpose network debugging desktop tool built with Tauri v2 and React. It supports multiple protocols (TCP, UDP, WebSocket, Serial, HTTP), user scripting for automation, and custom data parsing — all wrapped in a clean, modern SaaS-style UI.

## Core Value

Users can connect to any network or serial device, send and receive data in real time, and use scripts to automate and parse the data flow — all in one lightweight desktop app.

## Requirements

### Validated

- TCP Client/Server — established
- UDP — established
- WebSocket Client — established
- Multi-session tabbed interface — established
- Hex/Text dual-mode data logging — established
- Real-time traffic chart — established
- Quick send commands — established
- i18n (zh-CN, en) — established
- Save-to-file logging — established

### Active

- [ ] Modern UI redesign (Linear/Vercel SaaS style)
- [ ] Architecture refactoring (split store, extract constants, component decomposition)
- [ ] Serial port full implementation (backend + frontend wiring)
- [ ] HTTP/HTTPS Client (lightweight Postman-like experience)
- [ ] JavaScript script engine for data processing and automation
- [ ] Data parsing: checksum calculation, custom protocol templates, JSON formatting
- [ ] Unit and integration tests
- [ ] Performance optimization (log filtering, virtual list, traffic chart)
- [ ] Bug fixes: log ID persistence, error swallowing, disconnect handling

### Out of Scope

- Mobile app — desktop-only, Tauri framework constraint
- gRPC — complexity too high for current phase; reconsider after v1
- Visual rule engine — JS scripting covers automation use cases
- BLE/Bluetooth/CAN bus — not core to current target users
- Cloud sync / accounts — offline-first desktop tool

## Context

This project started as an early open-source network debugging tool. The codebase has working TCP/UDP/WebSocket support but several incomplete features (Serial port UI stub, Scripts placeholder) and architectural debt that needs addressing before scaling. The user wants to evolve it into a polished, feature-complete tool competitive with existing network utilities.

## Constraints

- **Tech stack**: Tauri v2 + React + TypeScript + Rust — fixed, not negotiable
- **Platform**: Desktop only (Windows, macOS, Linux via Tauri)
- **Offline-first**: No cloud dependencies or accounts
- **i18n**: Must maintain zh-CN and en support
- **Bundle size**: Keep reasonable; avoid heavy dependencies

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| UI redesign first, then features | New features should be built on the new design system, not retrofitted | — Pending |
| JS scripts over visual rules | More flexible, lower maintenance, familiar to developers | — Pending |
| Dark+modern hybrid style | Not traditional dark terminal, not pure light SaaS — something in between | — Pending |
| Desktop only, no mobile | Tauri constraint; mobile would require separate codebase | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-15 after project initialization*
