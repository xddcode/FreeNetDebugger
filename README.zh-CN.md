<div align="center">

## FreeNetDebugger

高性能、跨平台网络调试工具（Tauri + Rust + React）。

[![star](https://gitee.com/xddcode/free-net-debugger/badge/star.svg?theme=dark)](https://gitee.com/xddcode/free-net-debugger/stargazers)
[![fork](https://gitee.com/xddcode/free-net-debugger/badge/fork.svg?theme=dark)](https://gitee.com/xddcode/free-net-debugger/members)
[![GitHub stars](https://img.shields.io/github/stars/xddcode/free-net-debugger?logo=github)](https://github.com/xddcode/free-net-debugger/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/xddcode/free-net-debugger?logo=github)](https://github.com/xddcode/free-net-debugger/network)
[![AUR](https://img.shields.io/badge/license-Apache%20License%202.0-blue.svg)](https://gitee.com/dromara/free-fs/blob/master/LICENSE)
[![License: Apache_2.0](https://img.shields.io/badge/License-Apache_2.0-cyan.svg)](LICENSE)
[![Built with Tauri](https://img.shields.io/badge/Built_with-Tauri_v2-cyan)](https://tauri.app)

[问题反馈](https://gitee.com/xddcode/free-net-debugger/issues) · [功能请求](https://gitee.com/xddcode/free-net-debugger/issues/new)

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

![预览 1](_images/1.png)
![预览 2](_images/2.png)
![预览 3](_images/3.png)
![预览 4](_images/4.png)

## 技术栈

- 前端：React 19、TypeScript、Zustand、i18next、Tailwind CSS
- 后端：Rust、Tokio、Tauri v2
- 构建：Vite

## 快速开始

### 环境要求

- Rust >= 1.77
- Node.js >= 20
- Bun（或 npm/pnpm）
- Tauri 依赖：<https://tauri.app/start/prerequisites/>

### 开发模式

```bash
bun install
bun tauri dev
```

### 生产构建

```bash
bun tauri build
```

安装包输出目录：`src-tauri/target/release/bundle/`

## 开源许可

Apache License 2.0
