import type { Translations } from './en';

const zhCN: Translations = {
  // ── 状态标签 ─────────────────────────────────────────────────────────────
  status: {
    ready:      '就绪',
    connecting: '连接中...',
    connected:  '已连接',
    listening:  '监听中',
    error:      '错误',
    closing:    '断开中...',
    label:      '状态',
  },

  // ── 协议名称 ─────────────────────────────────────────────────────────────
  protocol: {
    TCP_CLIENT: 'TCP 客户端',
    TCP_SERVER: 'TCP 服务器',
    UDP_CLIENT: 'UDP 客户端',
    UDP_SERVER: 'UDP 服务器',
    WEBSOCKET:  'WebSocket',
    SERIAL:     '串口',
  },

  // ── 顶部栏 ───────────────────────────────────────────────────────────────
  header: {
    newSession: '新建会话',
  },

  // ── 网络配置面板 ─────────────────────────────────────────────────────────
  network: {
    title:         '网络设置',
    protocolType:  '协议类型',
    wsUrl:         'WebSocket 地址',
    listenAddress: '监听地址',
    listenPort:    '监听端口',
    remoteIp:      '远端 IP',
    remotePort:    '远端端口',
    localPort:     '本地端口',
    localPortAuto: '0（自动）',
    connect:       '连接',
    disconnect:    '断开连接',
    connecting:    '连接中...',
  },

  // ── 接收设置面板 ─────────────────────────────────────────────────────────
  receive: {
    title:          '接收设置',
    modeAuto:       '自动（UTF-8 或 HEX）',
    modeHex:        'HEX',
    modeHexText:    'HEX + 文本',
    modeUtf8:       'UTF-8',
    modeAscii:      'ASCII',
    nonPrintableDot:'不可打印字符：点号 (.)',
    nonPrintableHex:'不可打印字符：十六进制 (\\xNN)',
    showAsLog:      '日志模式显示',
    autoNewline:    '收到数据后自动换行',
    saveToFile:     '保存到文件...',
    pauseReceiving: '暂停接收',
    exportLog:      '导出日志',
    clearRx:        '清空日志',
    stoppedSaving:  '已停止写入文件',
    startedSaving:  '数据实时写入文件中...',
    handleMissingDisabled: '文件句柄不可用，已关闭保存到文件',
  },

  // ── 发送设置面板 ─────────────────────────────────────────────────────────
  sendSettings: {
    title:          '发送设置',
    autoEscapes:    '解析转义字符（\\n \\r \\x..）',
    autoCRLF:       '自动追加 CRLF',
    autoChecksum:   '自动追加校验码',
    periodic:       '定时发送',
    quickShortcuts: '快捷指令',
    sendHistory:    '发送历史',
  },

  // ── 快捷指令 ─────────────────────────────────────────────────────────────
  shortcuts: {
    empty:           '暂无快捷指令',
    namePlaceholder: '名称...',
    dataPlaceholder: '数据...',
    send:            '发送',
    save:            '保存',
    add:             '+ 添加快捷指令',
  },

  // ── 发送历史 ─────────────────────────────────────────────────────────────
  history: {
    empty: '暂无发送历史',
  },

  // ── 数据日志 ─────────────────────────────────────────────────────────────
  log: {
    title:             '数据日志',
    clear:             '清空',
    searchPlaceholder: '搜索日志...',
    connectFirst:      '请先建立连接',
    waiting:           '等待数据...',
    dirRecv:           '接收',
    dirSend:           '发送',
    dirSystem:         '系统',
  },

  // ── 数据发送区 ───────────────────────────────────────────────────────────
  send: {
    title:            '数据发送',
    openFile:         '打开文件',
    clear:            '清空',
    sendBtn:          '发送',
    hexPlaceholder:   '十六进制数据，例如 01 02 FF',
    asciiPlaceholder: '输入要发送的数据...（Ctrl+Enter 发送）',
    sendFailed:       '发送失败',
  },

  // ── 状态栏 ───────────────────────────────────────────────────────────────
  statusBar: {
    rx:          '接收',
    tx:          '发送',
    resetCounts: '重置',
  },

  // ── 流量图表 ─────────────────────────────────────────────────────────────
  traffic: {
    title:      '流量分析',
    visualizer: '实时流量监控',
    totalIn:    '总接收',
    totalOut:   '总发送',
  },
};

export default zhCN;
