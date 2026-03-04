# FreeNetDebugger

> **A high-performance, cross-platform network debugging tool built for engineers who demand speed.**

**English | [中文](README.zh-CN.md)**

[![License: MIT](https://img.shields.io/badge/License-MIT-cyan.svg)](LICENSE)
[![Built with Tauri](https://img.shields.io/badge/Built_with-Tauri_v2-cyan)](https://tauri.app)
[![Rust](https://img.shields.io/badge/Backend-Rust_+_Tokio-orange)](https://tokio.rs)
[![React](https://img.shields.io/badge/Frontend-React_19-blue)](https://react.dev)

---

## Why FreeNetDebugger?

Most network debuggers are either too simple or too slow. FreeNetDebugger is engineered from the ground up around **three non-negotiable principles**:

| Principle | How |
|-----------|-----|
| **Extreme throughput** | Rust + Tokio async I/O with 64 KB read buffers; TCP_NODELAY for minimum latency; frontend batch-flushes events every 80 ms — UI stays fluid at 100 MB/s+ |
| **Zero UI jank** | React 19 with virtual scrolling (no DOM node limit), `React.memo` row rendering, and a decoupled data pipeline that never blocks the render thread |
| **Open & extensible** | Clean architecture with typed interfaces and reserved hooks for pro features (custom protocol parsers, script-driven visualizations) |

---

## Features

### Protocol Support
- **TCP Client** — connect to any TCP server
- **TCP Server** — accept multiple simultaneous clients, broadcast to all
- **UDP Client / Server** — datagram send/receive with source address display
- **WebSocket Client** — `ws://` and `wss://` with binary/text frame support
- **Serial Port** *(coming soon)* — COM/tty with full baud/parity/stop-bit configuration

### Data Display
- Hex · ASCII · UTF-8 · Base64 display modes
- Timestamp and source address per entry
- Virtual scrolling — handles **millions of log entries** without performance degradation
- Real-time keyword search / filter

### Sending
- Escape sequence parsing (`\r`, `\n`, `\x41`, `\u0041`)
- Checksum append — CRC16 Modbus · LRC · Checksum-8
- **Periodic send** — configurable interval with auto-stop after N times
- **Quick shortcuts** — save frequently used payloads, one click to send
- **Send history** — recent sends stored per session, click to re-send
- **Send from file** — load binary or text payloads directly from disk

### Logging & Export
- **Stream-to-file** — live capture to disk via File System Access API (no memory limit)
- **Manual export** — download full session log as `.txt`
- Pause / resume receiving without disconnecting

### Sessions
- Unlimited multi-tab sessions
- Per-session settings (encoding, checksum, etc.)
- State persisted across restarts via `localStorage`

### Visualisation
- RX / TX sparklines — 60-second real-time bandwidth chart
- Status bar with live byte counters and remote address

---

## Architecture

```
┌───────────────────────── Frontend (React 19) ──────────────────────────┐
│  AppLayout                                                               │
│  ├── ConnectionPanel  (config, quick cmds, history)                      │
│  ├── DataLog          (virtual list, filter, crt fx)                     │
│  ├── DataSend         (encode, checksum, periodic, file)                 │
│  ├── TrafficChart     (SVG sparklines, 1 s sampling)                     │
│  └── StatusBar        (RX/TX counters, remote addr)                      │
│                                                                           │
│  State: Zustand + immer + persist  ──────────────────────────────────    │
│                                                                           │
│  Data pipeline:                                                           │
│    Tauri event  →  80 ms batch buffer  →  appendLogs()  →  virtualizer  │
└───────────────────────────────────────────────────────────────────────────┘
                │ IPC (Tauri commands + events)
┌───────────────────────── Backend (Rust + Tokio) ────────────────────────┐
│  connect()  disconnect()  send_data()  list_serial_ports()               │
│                                                                           │
│  Each connection runs in an independent Tokio task:                       │
│    TCP Client  →  TCP_NODELAY + BufWriter + 64 KB read buf               │
│    TCP Server  →  accept loop + per-client mpsc channels (cap 2048)      │
│    UDP         →  Arc<UdpSocket> shared between rx/tx tasks              │
│    WebSocket   →  tokio-tungstenite sink/stream split                    │
│                                                                           │
│  Events emitted to frontend: net:data  net:status                        │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Performance Notes

| Metric | Target | Mechanism |
|--------|--------|-----------|
| Backend throughput | ≥ 100 MB/s | Tokio async, 64 KB buffers, zero-copy slicing |
| Send latency | < 1 ms | TCP_NODELAY, BufWriter flush per send |
| UI frame rate | 60 fps at 50k msg/s | 80 ms event batching, `React.memo`, virtual scrolling |
| Log capacity | Unlimited (display cap 50k) | Auto-trim oldest entries, stream-to-file for archives |
| Memory | ~50 MB idle | Virtual DOM, no off-screen DOM nodes |

---

## Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| [Rust](https://rustup.rs) | ≥ 1.77 |
| [Node.js](https://nodejs.org) | ≥ 20 LTS |
| [Bun](https://bun.sh) | ≥ 1.1 (or npm/pnpm) |
| Tauri CLI prerequisites | See [Tauri docs](https://tauri.app/start/prerequisites/) |

### Development

```bash
# Install frontend dependencies
bun install

# Start development build (hot-reload)
bun tauri dev
```

### Production Build

```bash
bun tauri build
```

Outputs a native installer in `src-tauri/target/release/bundle/`.

---

## Project Structure

```
FreeNetDebugger/
├── src/                        # React frontend
│   ├── components/
│   │   ├── layout/             # AppLayout — top-level shell
│   │   ├── sidebar/            # ConnectionPanel — config + quick cmds
│   │   ├── log/                # DataLog — virtual scrolling log viewer
│   │   ├── send/               # DataSend — encoding, periodic, file
│   │   ├── status/             # StatusBar
│   │   └── traffic/            # TrafficChart — SVG sparklines
│   ├── store/                  # Zustand store (immer + persist)
│   ├── types/                  # TypeScript interfaces
│   └── utils/                  # encoding, checksum, tauri IPC helpers
└── src-tauri/                  # Rust backend
    └── src/lib.rs              # All Tauri commands and network logic
```

---

## Roadmap

- [ ] Serial Port full implementation
- [ ] WebSocket Server mode
- [ ] MQTT client
- [ ] **Pro: Script-driven protocol parser** — user-defined JS/Lua scripts to decode frames into structured fields with custom visualizations *(architecture hooks reserved)*
- [ ] Plugin API (community protocol decoders)
- [ ] Session replay / recording
- [ ] Dark / light theme toggle

---

## Contributing

Contributions are welcome. Please:
1. Fork the repo and create a feature branch
2. Run `bun lint` before submitting — zero warnings policy
3. Keep Rust code `cargo clippy` clean
4. Open a PR with a clear description of the change and motivation

---

## License

MIT © FreeNetDebugger Contributors
