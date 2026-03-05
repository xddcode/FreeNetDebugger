<div align="center">

<img alt="FreeNetDebugger Logo" src="./public/app-icon.png" width="100"/>

## FreeNetDebugger

高性能、跨平台网络调试工具（Tauri + Rust + React）。

[![star](https://gitee.com/xddcode/free-net-debugger/badge/star.svg?theme=dark)](https://gitee.com/xddcode/free-net-debugger/stargazers)
[![fork](https://gitee.com/xddcode/free-net-debugger/badge/fork.svg?theme=dark)](https://gitee.com/xddcode/free-net-debugger/members)
[![GitHub stars](https://img.shields.io/github/stars/xddcode/FreeNetDebugger?logo=github)](https://github.com/xddcode/FreeNetDebugger/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/xddcode/FreeNetDebugger?logo=github)](https://github.com/xddcode/FreeNetDebugger/network)
[![AUR](https://img.shields.io/badge/license-Apache%20License%202.0-blue.svg)](https://gitee.com/dromara/free-fs/blob/master/LICENSE)
[![License: Apache_2.0](https://img.shields.io/badge/License-Apache_2.0-cyan.svg)](LICENSE)
[![Built with Tauri](https://img.shields.io/badge/Built_with-Tauri_v2-cyan)](https://tauri.app)

[问题反馈](https://gitee.com/xddcode/free-net-debugger/issues) · [功能请求](https://gitee.com/xddcode/free-net-debugger/issues/new)

仓库地址：
[Gitee](https://gitee.com/xddcode/free-net-debugger) · [GitHub](https://github.com/xddcode/FreeNetDebugger)

**[English](README.md) | 中文**

</div>

## 核心能力

- 多协议支持：`TCP Client/Server`、`UDP Client/Server`、`WebSocket`
- 实时日志面板：虚拟滚动 + 关键词过滤
- 灵活发送链路：ASCII/HEX、转义解析、校验、定时发送
- 发送中心抽屉：历史、快捷指令、快速 RUN/PASTE
- 长时抓包能力：导出日志 + 实时保存到文件
- 实时流量指标：当前速率、峰值、累计量

## 预览图

| 预览 1 | 预览 2 |
| ------ | ------ |
| <img alt="预览 1" src="_images/1.png" width="420" /> | <img alt="预览 2" src="_images/2.png" width="420" /> |

| 预览 3 | 预览 4 |
| ------ | ------ |
| <img alt="预览 3" src="_images/3.png" width="420" /> | <img alt="预览 4" src="_images/4.png" width="420" /> |

## 技术栈

- 前端：React 19、TypeScript、Zustand、i18next、Tailwind CSS
- 后端：Rust、Tokio、Tauri v2
- 构建：Vite

## 安装方式

### 方式一：下载安装包（推荐）

[![Download FreeNetDebugger](https://a.fsdn.com/con/app/sf-download-button)](https://sourceforge.net/projects/freenetdebugger/files/)

- [前往 GitHub Releases 下载](https://github.com/xddcode/FreeNetDebugger/releases)
- [前往 SourceForge 下载](https://sourceforge.net/projects/freenetdebugger/files/)
- 根据系统和架构选择对应资产（例如 Windows `.msi`，Macos `.dmg`）
- 下载后直接安装运行

### 方式二：源码构建安装

适用于需要二次开发、本地补丁或调试构建的场景。

#### 环境要求

- Rust >= 1.77
- Node.js >= 20
- Bun（或 npm/pnpm）
- Tauri 依赖：<https://tauri.app/start/prerequisites/>

#### 构建安装包/可分发文件

```bash
bun install
bun tauri build
```

产物目录：`src-tauri/target/release/bundle/`

#### 开发模式

```bash
bun install
bun tauri dev
```

## 路线图（Roadmap）

- [ ] 串口调试支持（端口扫描、波特率/校验位配置、收发链路）
- [ ] TLS/SSL 支持（TCP Client 安全连接）
- [ ] WebSocket 高级能力（自定义 Header、子协议）
- [ ] 会话导入/导出与模板化管理
- [ ] 脚本化协议解析（结构化视图、字段提取）

## 开源许可

Apache License 2.0


## 联系方式

- GitHub: [@Freedom](https://github.com/xddcode)
- Gitee: [@Freedom](https://gitee.com/xddcode)
- Email: xddcodec@gmail.com
- 微信：

  **添加微信，请注明来意**

<img alt="wx.png" height="300" src="./_images/wx.png" width="250"/>

- 微信公众号：

<img alt="wp.png" src="./_images/mp.png"/>

---

## 捐赠

如果你认为 FreeNetDebugger 项目可以为你提供帮助，或者给你带来方便和灵感，或者你认同这个项目，可以为我的付出赞助一下哦！

请给一个 ⭐️ 支持一下！

<img alt="pay.png" height="300" src="./_images/pay.png" width="250"/>

<div align="center">

Made with ❤️ by [@xddcode](https://gitee.com/xddcode)

</div>

