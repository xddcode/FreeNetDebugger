const en = {
  // ── Status labels ─────────────────────────────────────────────────────────
  status: {
    ready: 'Ready',
    connecting: 'Connecting...',
    connected: 'Connected',
    listening: 'Listening',
    error: 'Error',
    closing: 'Closing...',
    label: 'Status',
  },

  // ── Protocol names ────────────────────────────────────────────────────────
  protocol: {
    TCP_CLIENT: 'TCP Client',
    TCP_SERVER: 'TCP Server',
    UDP_CLIENT: 'UDP Client',
    UDP_SERVER: 'UDP Server',
    WEBSOCKET:  'WebSocket',
    SERIAL:     'Serial Port',
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    newSession: 'New Session',
  },

  // ── Network config panel ──────────────────────────────────────────────────
  network: {
    title:          'Network Settings',
    protocolType:   'Protocol Type',
    wsUrl:          'WebSocket URL',
    listenAddress:  'Listen Address',
    listenPort:     'Listen Port',
    remoteIp:       'Remote IP',
    remotePort:     'Remote Port',
    localPort:      'Local Port',
    localPortAuto:  '0 (auto)',
    connect:        'Connect',
    disconnect:     'Disconnect',
    connecting:     'Connecting...',
  },

  // ── Receive settings panel ────────────────────────────────────────────────
  receive: {
    title:          'Receive Settings',
    modeAuto:       'Auto (UTF-8 or HEX)',
    modeHex:        'HEX',
    modeHexText:    'HEX + Text',
    modeUtf8:       'UTF-8',
    modeAscii:      'ASCII',
    nonPrintableDot:'Non-printable: Dot (.)',
    nonPrintableHex:'Non-printable: Hex (\\xNN)',
    showAsLog:      'Show as Log',
    autoNewline:    'Auto-newline',
    saveToFile:     'Save to File...',
    pauseReceiving: 'Pause Receiving',
    exportLog:      'Export Log',
    clearRx:        'Clear Log',
    stoppedSaving:  'Stopped saving to file',
    startedSaving:  'Saving data to file...',
    handleMissingDisabled: 'File handle unavailable, save-to-file disabled',
  },

  // ── Send settings panel ───────────────────────────────────────────────────
  sendSettings: {
    title:           'Send Settings',
    autoEscapes:     'Parse Escapes  (\\n \\r \\x..)',
    autoCRLF:        'Auto-append CRLF',
    autoChecksum:    'Auto-append Checksum',
    periodic:        'Periodic',
    quickShortcuts:  'Quick Shortcuts',
    sendHistory:     'Send History',
  },

  // ── Quick shortcuts ───────────────────────────────────────────────────────
  shortcuts: {
    empty:           'No shortcuts yet',
    namePlaceholder: 'Name...',
    dataPlaceholder: 'Data...',
    send:            'Send',
    save:            'Save',
    add:             '+ Add Shortcut',
  },

  // ── Send history ──────────────────────────────────────────────────────────
  history: {
    empty: 'No send history yet',
  },

  // ── Data Log ──────────────────────────────────────────────────────────────
  log: {
    title:            'Data Log',
    clear:            'Clear',
    searchPlaceholder:'Search log...',
    connectFirst:     'Connect to start receiving data',
    waiting:          'Waiting for data...',
    dirRecv:          'RECV',
    dirSend:          'SEND',
    dirSystem:        'SYSTEM',
  },

  // ── Data Send ─────────────────────────────────────────────────────────────
  send: {
    title:            'Data Send',
    openFile:         'Open File',
    clear:            'Clear',
    sendBtn:          'SEND',
    hexPlaceholder:   'Hex bytes, e.g. 01 02 FF',
    asciiPlaceholder: 'Data to send...  (Ctrl+Enter)',
    sendFailed:       'Send failed',
  },

  // ── Status bar ────────────────────────────────────────────────────────────
  statusBar: {
    rx:          'RX',
    tx:          'TX',
    resetCounts: 'Reset',
  },

  // ── Traffic chart ─────────────────────────────────────────────────────────
  traffic: {
    title:      'Traffic Analysis',
    visualizer: 'DATA FLOW VISUALIZER',
    totalIn:    'Total In',
    totalOut:   'Total Out',
  },
};

export default en;

// Derive the shape from the English file so Chinese must cover all keys,
// but values are typed as `string` to allow any language's text.
type DeepString<T> = { [K in keyof T]: T[K] extends object ? DeepString<T[K]> : string };
export type Translations = DeepString<typeof en>;
