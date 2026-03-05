<div align="center">

<img alt="FreeNetDebugger Logo" src="./public/app-icon.png" width="100"/>

## FreeNetDebugger

High-performance, cross-platform network debugging tool built with Tauri + Rust + React.

[![star](https://gitee.com/xddcode/free-net-debugger/badge/star.svg?theme=dark)](https://gitee.com/xddcode/free-net-debugger/stargazers)
[![fork](https://gitee.com/xddcode/free-net-debugger/badge/fork.svg?theme=dark)](https://gitee.com/xddcode/free-net-debugger/members)
[![GitHub stars](https://img.shields.io/github/stars/xddcode/FreeNetDebugger?logo=github)](https://github.com/xddcode/FreeNetDebugger/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/xddcode/FreeNetDebugger?logo=github)](https://github.com/xddcode/FreeNetDebugger/network)
[![AUR](https://img.shields.io/badge/license-Apache%20License%202.0-blue.svg)](https://gitee.com/dromara/free-fs/blob/master/LICENSE)
[![License: Apache_2.0](https://img.shields.io/badge/License-Apache_2.0-cyan.svg)](LICENSE)
[![Built with Tauri](https://img.shields.io/badge/Built_with-Tauri_v2-cyan)](https://tauri.app)

[问题反馈](https://github.com/xddcode/FreeNetDebugger/issues) · [功能请求](https://github.com/xddcode/FreeNetDebugger/issues/new)

Repository:
[Gitee](https://gitee.com/xddcode/free-net-debugger) · [GitHub](https://github.com/xddcode/FreeNetDebugger)

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

| Preview 1 | Preview 2 |
| --------- | --------- |
| <img alt="Preview 1" src="_images/1.png" width="420" /> | <img alt="Preview 2" src="_images/2.png" width="420" /> |

| Preview 3 | Preview 4 |
| --------- | --------- |
| <img alt="Preview 3" src="_images/3.png" width="420" /> | <img alt="Preview 4" src="_images/4.png" width="420" /> |

## Tech Stack

- Frontend: React 19, TypeScript, Zustand, i18next, Tailwind CSS
- Backend: Rust, Tokio, Tauri v2
- Build: Vite

## Installation

### Option 1: Install Prebuilt Package (Recommended)

For production use, download the installer/package from the official release channels:

- [Download from GitHub Releases](https://github.com/xddcode/FreeNetDebugger/releases)
- [Download from SourceForge](https://sourceforge.net/projects/freenetdebugger/files/)
- Choose the asset that matches your OS and architecture (for example, Windows `.msi`, macOS `.dmg`)
- Install and launch directly

[![Download FreeNetDebugger](https://a.fsdn.com/con/app/sf-download-button)](https://sourceforge.net/projects/freenetdebugger/files/)

### Option 2: Build and Install from Source

Use this path when you need custom builds, local patching, or development debugging.

#### Prerequisites

- Rust >= 1.77
- Node.js >= 20
- Bun (or npm/pnpm)
- Tauri prerequisites: <https://tauri.app/start/prerequisites/>

#### Build Installer/Bundle

```bash
bun install
bun tauri build
```

Output: `src-tauri/target/release/bundle/`

#### Development Mode

```bash
bun install
bun tauri dev
```

## Contact

- GitHub: [@Freedom](https://github.com/xddcode)
- Gitee: [@Freedom](https://gitee.com/xddcode)
- Email: xddcodec@gmail.com
- WeChat:

  **Please include your purpose when adding me on WeChat**

<img alt="wx.png" height="300" src="./_images/wx.png" width="250"/>

- WeChat Official Account:

<img alt="wp.png" src="./_images/mp.png"/>

---

## Donation

If FreeNetDebugger helps your work, gives you convenience, inspiration, or you simply support this project, you are welcome to sponsor its continued development.

Please leave a ⭐️ to support the project!

<img alt="pay.png" height="300" src="./_images/pay.png" width="250"/>

<div align="center">

Made with ❤️ by [@xddcode](https://gitee.com/xddcode)

</div>

## License

Apache License 2.0
