<div align="center">

## FreeNetDebugger

High-performance, cross-platform network debugging tool built with Tauri + Rust + React.

[![star](https://gitee.com/xddcode/free-net-debugger/badge/star.svg?theme=dark)](https://gitee.com/xddcode/free-net-debugger/stargazers)
[![fork](https://gitee.com/xddcode/free-net-debugger/badge/fork.svg?theme=dark)](https://gitee.com/xddcode/free-net-debugger/members)
[![GitHub stars](https://img.shields.io/github/stars/xddcode/free-net-debugger?logo=github)](https://github.com/xddcode/free-net-debugger/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/xddcode/free-net-debugger?logo=github)](https://github.com/xddcode/free-net-debugger/network)
[![AUR](https://img.shields.io/badge/license-Apache%20License%202.0-blue.svg)](https://gitee.com/dromara/free-fs/blob/master/LICENSE)
[![License: Apache_2.0](https://img.shields.io/badge/License-Apache_2.0-cyan.svg)](LICENSE)
[![Built with Tauri](https://img.shields.io/badge/Built_with-Tauri_v2-cyan)](https://tauri.app)

[问题反馈](https://github.com/xddcode/free-net-debugger/issues) · [功能请求](https://github.com/xddcode/free-net-debugger/issues/new)

**English | [中文](README.zh-CN.md)**

</div>

## Core Capabilities

- Multi-protocol support: `TCP Client/Server`, `UDP Client/Server`, `WebSocket`
- Real-time log panel with virtual scrolling and filtering
- Flexible send pipeline: ASCII/HEX, escape parsing, checksum, periodic send
- Send Center drawer: history, shortcuts, quick run/paste workflow
- Export and stream-to-file for long-running capture sessions
- Live traffic metrics: current throughput, peak, and totals

## Preview

![Preview 1](_images/1.png)
![Preview 2](_images/2.png)
![Preview 3](_images/3.png)
![Preview 4](_images/4.png)

## Tech Stack

- Frontend: React 19, TypeScript, Zustand, i18next, Tailwind CSS
- Backend: Rust, Tokio, Tauri v2
- Build: Vite

## Quick Start

### Prerequisites

- Rust >= 1.77
- Node.js >= 20
- Bun (or npm/pnpm)
- Tauri prerequisites: <https://tauri.app/start/prerequisites/>

### Development

```bash
bun install
bun tauri dev
```

### Build

```bash
bun tauri build
```

Package output: `src-tauri/target/release/bundle/`

## License

Apache License 2.0
