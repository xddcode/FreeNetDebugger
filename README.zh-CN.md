# FreeNetDebugger

> **专为追求极致性能的工程师打造的高性能跨平台网络调试工具。**

[![License: MIT](https://img.shields.io/badge/License-MIT-cyan.svg)](LICENSE)
[![Built with Tauri](https://img.shields.io/badge/构建于-Tauri_v2-cyan)](https://tauri.app)
[![Rust](https://img.shields.io/badge/后端-Rust_+_Tokio-orange)](https://tokio.rs)
[![React](https://img.shields.io/badge/前端-React_19-blue)](https://react.dev)

**[English](README.md) | 中文**

---

## 为什么选择 FreeNetDebugger？

大多数网络调试器要么功能太简陋，要么性能太差。FreeNetDebugger 从架构层面围绕**三个不可妥协的原则**设计：

| 原则 | 实现方式 |
|------|----------|
| **极致吞吐** | Rust + Tokio 异步 I/O，64 KB 读缓冲区；TCP_NODELAY 最小化发送延迟；前端 80ms 批量刷新事件 —— UI 在 100 MB/s+ 下依然丝滑 |
| **零 UI 卡顿** | React 19 虚拟滚动（无 DOM 节点上限），`React.memo` 行级渲染，解耦的数据管道永远不阻塞渲染线程 |
| **开放可扩展** | 清晰的类型接口，预留 Pro 版功能钩子（自定义协议解析器、脚本驱动可视化） |

---

## 功能特性

### 协议支持
- **TCP 客户端** — 连接任意 TCP 服务器
- **TCP 服务器** — 支持多客户端同时接入，广播发送
- **UDP 客户端 / 服务器** — 数据报收发，显示来源地址
- **WebSocket 客户端** — 支持 `ws://` 和 `wss://`，二进制/文本帧均可
- **串口** *(即将支持)* — COM/tty，完整波特率/校验位/停止位配置

### 数据显示
- Hex · ASCII · UTF-8 · Base64 多种显示模式
- 每条记录显示时间戳和来源地址
- 虚拟滚动 —— **百万条日志**无性能衰退
- 实时关键字搜索 / 过滤

### 数据发送
- 转义序列解析（`\r`、`\n`、`\x41`、`\u0041`）
- 自动追加校验码 —— CRC16 Modbus · LRC · Checksum-8
- **定时发送** —— 可配置间隔与发送次数上限
- **快捷指令** —— 保存常用载荷，一键发送
- **发送历史** —— 按 Session 记录近期发送，点击重发
- **从文件发送** —— 直接加载二进制或文本文件作为发送内容

### 日志与导出
- **流式写入文件** —— 通过 File System Access API 实时落盘，无内存上限
- **手动导出** —— 一键下载完整 Session 日志为 `.txt`
- 暂停 / 恢复接收，不断开连接

### 多 Session 管理
- 无限多标签页 Session
- 每个 Session 独立配置（编码、校验、显示等）
- 状态通过 `localStorage` 持久化，重启后恢复

### 可视化
- RX / TX 实时流量折线图 —— 展示近 60 秒带宽历史
- 底部状态栏实时显示字节计数和远端地址

---

## 架构设计

```
┌───────────────────────── 前端 (React 19) ──────────────────────────────┐
│  AppLayout                                                               │
│  ├── ConnectionPanel  (配置、快捷指令、发送历史)                          │
│  ├── DataLog          (虚拟列表、过滤、CRT 特效)                          │
│  ├── DataSend         (编码、校验、定时、文件)                            │
│  ├── TrafficChart     (SVG 折线图，1s 采样)                              │
│  └── StatusBar        (RX/TX 计数、远端地址)                             │
│                                                                           │
│  状态管理：Zustand + immer + persist                                      │
│                                                                           │
│  数据管道：                                                               │
│    Tauri 事件  →  80ms 批量缓冲  →  appendLogs()  →  虚拟列表            │
└───────────────────────────────────────────────────────────────────────────┘
                │ IPC (Tauri commands + events)
┌───────────────────────── 后端 (Rust + Tokio) ───────────────────────────┐
│  connect()  disconnect()  send_data()  list_serial_ports()               │
│                                                                           │
│  每个连接运行于独立 Tokio Task：                                           │
│    TCP 客户端  →  TCP_NODELAY + BufWriter + 64 KB 读缓冲                 │
│    TCP 服务器  →  accept 循环 + 每客户端独立 mpsc 通道（容量 2048）       │
│    UDP         →  Arc<UdpSocket> 读写 task 共享                          │
│    WebSocket   →  tokio-tungstenite sink/stream 分离                     │
│                                                                           │
│  向前端发送事件：net:data  net:status                                     │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 性能数据

| 指标 | 目标 | 实现机制 |
|------|------|----------|
| 后端吞吐量 | ≥ 100 MB/s | Tokio 异步 I/O，64 KB 缓冲，零拷贝切片 |
| 发送延迟 | < 1 ms | TCP_NODELAY，每次发送后立即 flush |
| UI 帧率 | 60 fps @ 5 万条/s | 80ms 事件批处理，`React.memo`，虚拟滚动 |
| 日志容量 | 无上限（显示窗口 5 万条） | 自动裁剪旧条目，超限内容流式写文件 |
| 内存占用 | ~50 MB 空载 | 虚拟 DOM，不在 DOM 中保留不可见节点 |

---

## 快速开始

### 环境要求

| 工具 | 版本要求 |
|------|----------|
| [Rust](https://rustup.rs) | ≥ 1.77 |
| [Node.js](https://nodejs.org) | ≥ 20 LTS |
| [Bun](https://bun.sh) | ≥ 1.1（也可用 npm / pnpm） |
| Tauri CLI 依赖 | 参考 [Tauri 官方文档](https://tauri.app/start/prerequisites/) |

### 开发模式

```bash
# 安装前端依赖
bun install

# 启动开发构建（热更新）
bun tauri dev
```

### 生产构建

```bash
bun tauri build
```

产物（安装包）位于 `src-tauri/target/release/bundle/`。

---

## 项目结构

```
FreeNetDebugger/
├── src/                        # React 前端
│   ├── components/
│   │   ├── layout/             # AppLayout — 顶层布局壳
│   │   ├── sidebar/            # ConnectionPanel — 配置 + 快捷指令
│   │   ├── log/                # DataLog — 虚拟滚动日志视图
│   │   ├── send/               # DataSend — 编码、定时、文件发送
│   │   ├── status/             # StatusBar — 状态栏
│   │   └── traffic/            # TrafficChart — SVG 流量折线图
│   ├── store/                  # Zustand 状态（immer + persist）
│   ├── types/                  # TypeScript 类型定义
│   └── utils/                  # 编码、校验、Tauri IPC 封装
└── src-tauri/                  # Rust 后端
    └── src/lib.rs              # 全部 Tauri 命令与网络逻辑
```

---

## 开发规范

```bash
# 前端代码检查（零 warning 策略）
bun lint

# 自动修复可修复的问题
bun lint:fix

# Rust 代码检查
cd src-tauri && cargo clippy
```

---

## 路线图

- [ ] 串口功能完整实现
- [ ] WebSocket 服务器模式
- [ ] MQTT 客户端
- [ ] **Pro：脚本驱动协议解析器** — 用户自定义 JS/Lua 脚本解码数据帧，生成自定义可视化面板 *(架构钩子已预留)*
- [ ] 插件 API（社区协议解码器生态）
- [ ] Session 录制与回放
- [ ] 深色 / 浅色主题切换

---

## 参与贡献

欢迎 PR 和 Issue。提交前请确保：
1. Fork 仓库，从 `main` 拉特性分支
2. 运行 `bun lint` — 保持零 warning
3. Rust 代码通过 `cargo clippy` 无警告
4. PR 描述清晰说明改动动机和测试方式

---

## 开源许可

MIT © FreeNetDebugger Contributors
