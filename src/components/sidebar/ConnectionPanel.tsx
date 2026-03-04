import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '../../utils/tauri';
import { useAppStore } from '../../store';
import type { Session, ProtocolType, EncodingMode, AsciiNonPrintableMode } from '../../types';
import { sendPanelBus } from '../../utils/sendPanelBus';
import { bytesToDisplay, formatTimestamp } from '../../utils/encoding';

function PanelCard({ children }: { children: React.ReactNode }) {
  return <div className="neon-card flex flex-col overflow-hidden shrink-0">{children}</div>;
}

function PanelHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 shrink-0"
      style={{ background: 'linear-gradient(to right,rgba(19,236,236,0.1),transparent)', borderBottom: '1px solid rgba(19,236,236,0.2)' }}>
      <span style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center' }}>{icon}</span>
      <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}>{label}</h3>
    </div>
  );
}

function FieldLabel({ seq, label }: { seq?: number; label: string }) {
  return (
    <label className="block mb-1 uppercase font-bold tracking-wider" style={{ color: '#94a3b8', fontSize: 10 }}>
      {seq && <span style={{ color: '#475569' }}>({seq}) </span>}{label}
    </label>
  );
}

function FieldInput({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="field-control w-full" />;
}

function FieldSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)} className="field-control pr-6 appearance-none cursor-pointer w-full">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <svg width="10" height="10" viewBox="0 0 10 10" className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="rgba(19,236,236,0.5)" strokeWidth="1.5"><polyline points="2,3 5,7 8,3" /></svg>
    </div>
  );
}

function CheckRow({ checked, onChange, label, accent }: { checked: boolean; onChange: (v: boolean) => void; label: string; accent?: boolean }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input type="checkbox" className={`custom-check ${accent ? 'accent' : ''}`} checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="text-xs transition-colors" style={{ color: '#cbd5e1', fontSize: 11 }}>{label}</span>
    </label>
  );
}

function RadioGroup({ options, value, onChange, accent }: { options: string[]; value: string; onChange: (v: string) => void; accent?: boolean }) {
  return (
    <div className="flex items-center gap-4 p-1.5 rounded" style={{ background: 'rgba(16,34,34,0.5)', border: '1px solid rgba(19,236,236,0.1)' }}>
      {options.map(opt => (
        <label key={opt} className="flex items-center gap-1.5 cursor-pointer select-none">
          <input type="radio" className={`custom-radio ${accent ? 'accent' : ''}`} checked={value === opt} onChange={() => onChange(opt)} />
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>{opt}</span>
        </label>
      ))}
    </div>
  );
}

interface QSPanelProps {
  onSend: (text: string, enc: EncodingMode) => void;
}

function QuickShortcutsPanel({ onSend }: QSPanelProps) {
  const { t } = useTranslation();
  const cmds             = useAppStore(s => s.quickCommands);
  const addCmd           = useAppStore(s => s.addQuickCommand);
  const removeCmd        = useAppStore(s => s.removeQuickCommand);
  const [name, setName]  = useState('');
  const [data, setData]  = useState('');
  const [enc, setEnc]    = useState<EncodingMode>('ASCII');
  const [adding, setAdding] = useState(false);

  return (
    <div className="px-3 pb-3 flex flex-col gap-2">
      {cmds.length === 0 && !adding && (
        <div style={{ color: '#1e3a3a', fontSize: 11, fontFamily: 'var(--font-mono)', textAlign: 'center', padding: '8px 0' }}>
          {t('shortcuts.empty')}
        </div>
      )}

      {cmds.map(cmd => (
        <div key={cmd.id} className="flex items-center gap-1.5 rounded px-2 py-1.5"
          style={{ background: 'rgba(16,34,34,0.6)', border: '1px solid rgba(19,236,236,0.1)' }}>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 10, color: 'var(--color-primary)', fontWeight: 600 }}>{cmd.name}</div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cmd.data}</div>
          </div>
          <button
            className="px-2 py-0.5 rounded text-xs font-bold"
            style={{ background: 'rgba(19,236,236,0.15)', border: '1px solid rgba(19,236,236,0.3)', color: 'var(--color-primary)', fontSize: 10, cursor: 'pointer' }}
            onClick={() => onSend(cmd.data, cmd.encoding)}
          >{t('shortcuts.send')}</button>
          <button onClick={() => removeCmd(cmd.id)} style={{ color: '#475569', fontSize: 14, lineHeight: 1, cursor: 'pointer' }}>×</button>
        </div>
      ))}

      {adding && (
        <div className="flex flex-col gap-1.5 p-2 rounded" style={{ background: 'rgba(16,34,34,0.6)', border: '1px solid rgba(19,236,236,0.15)' }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t('shortcuts.namePlaceholder')} className="field-control w-full" style={{ height: 26, fontSize: 11 }} />
          <textarea value={data} onChange={e => setData(e.target.value)} placeholder={t('shortcuts.dataPlaceholder')} rows={2}
            style={{ width: '100%', background: 'var(--color-bg-dark)', border: '1px solid rgba(19,236,236,0.3)', borderRadius: 3, padding: '4px 6px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', outline: 'none', resize: 'none' }} />
          <div className="flex items-center gap-2">
            <select value={enc} onChange={e => setEnc(e.target.value as EncodingMode)} className="field-control" style={{ height: 24, fontSize: 10, flex: 1 }}>
              <option>ASCII</option><option>HEX</option>
            </select>
            <button
              className="px-2 rounded text-xs font-bold"
              style={{ height: 24, background: 'rgba(19,236,236,0.15)', border: '1px solid rgba(19,236,236,0.3)', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 10 }}
              onClick={() => {
                if (!name.trim() || !data.trim()) {
                  return;
                }
                addCmd({ name: name.trim(), data: data.trim(), encoding: enc });
                setName(''); setData(''); setAdding(false);
              }}
            >{t('shortcuts.save')}</button>
            <button onClick={() => setAdding(false)} style={{ color: '#475569', fontSize: 13, cursor: 'pointer' }}>✕</button>
          </div>
        </div>
      )}

      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="w-full text-xs py-1 rounded"
          style={{ border: '1px dashed rgba(19,236,236,0.2)', color: 'rgba(19,236,236,0.5)', cursor: 'pointer', fontSize: 10 }}
        >{t('shortcuts.add')}</button>
      )}
    </div>
  );
}

function SendHistoryPanel({ history, onSelect }: { history: string[]; onSelect: (t: string) => void }) {
  const { t } = useTranslation();
  if (history.length === 0) {
    return <div style={{ color: '#1e3a3a', fontSize: 11, fontFamily: 'var(--font-mono)', textAlign: 'center', padding: '10px 12px' }}>{t('history.empty')}</div>;
  }
  return (
    <div className="flex flex-col gap-1 px-3 pb-3 max-h-40 overflow-y-auto">
      {history.map((text, i) => (
        <button
          key={i}
          onClick={() => onSelect(text)}
          className="text-left rounded px-2 py-1 transition-colors"
          style={{
            background: 'rgba(16,34,34,0.6)', border: '1px solid rgba(19,236,236,0.1)',
            fontFamily: 'var(--font-mono)', fontSize: 10, color: '#94a3b8',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            cursor: 'pointer',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(19,236,236,0.3)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(19,236,236,0.1)'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
        >
          {text.length > 60 ? text.slice(0, 60) + '…' : text}
        </button>
      ))}
    </div>
  );
}

interface Props {
  session: Session;
  onSendShortcut?: (text: string, enc: EncodingMode) => void;
  onSelectHistory?: (text: string) => void;
}

export default function ConnectionPanel({ session }: Props) {
  const { t } = useTranslation();
  const updateConfig       = useAppStore(s => s.updateConfig);
  const updateReceive      = useAppStore(s => s.updateReceiveSettings);
  const updateSend         = useAppStore(s => s.updateSendSettings);
  const setStatus          = useAppStore(s => s.setStatus);
  const appendLog          = useAppStore(s => s.appendLog);
  const clearLogs          = useAppStore(s => s.clearLogs);

  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showHistory, setShowHistory]     = useState(false);

  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);
  const writeChainRef = useRef<Promise<void>>(Promise.resolve());
  const lastSavedLogIdRef = useRef<number>(0);

  const { config, receiveSettings, sendSettings } = session;
  const isActive = session.status === 'connected' || session.status === 'listening';
  const isBusy   = session.status === 'connecting' || session.status === 'disconnecting';

  const handleConnect = async () => {
    if (isActive || isBusy) { await invoke('disconnect', { id: session.id }); return; }
    const proto = config.protocol;
    const cfg = {
      protocol: proto,
      remote_host: config.remoteHost || undefined,
      remote_port: config.remotePort || undefined,
      local_port:  config.localPort  || undefined,
      local_host:  config.localHost  || undefined,
      ws_url: proto === 'WEBSOCKET' ? config.wsUrl : undefined,
    };
    try {
      setStatus(session.id, 'connecting');
      await invoke('connect', { id: session.id, config: cfg });
    } catch (e) {
      setStatus(session.id, 'error', String(e));
      appendLog(session.id, { timestamp: Date.now(), direction: 'system', data: Array.from(new TextEncoder().encode(`ERROR: ${e}`)) });
    }
  };

  const handleSaveToFile = async (checked: boolean) => {
    updateReceive(session.id, { saveToFile: checked });
    if (!checked) {
      fileHandleRef.current = null;
      lastSavedLogIdRef.current = 0;
      appendLog(session.id, { timestamp: Date.now(), direction: 'system', data: Array.from(new TextEncoder().encode(t('receive.stoppedSaving'))) });
      return;
    }
    try {
      // @ts-expect-error – File System Access API not in TS lib yet
      const handle = await window.showSaveFilePicker({ suggestedName: `rx_log_${Date.now()}.txt`, types: [{ description: 'Text', accept: { 'text/plain': ['.txt'] } }] });
      fileHandleRef.current = handle;
      lastSavedLogIdRef.current = session.logs[session.logs.length - 1]?.id ?? 0;
      appendLog(session.id, { timestamp: Date.now(), direction: 'system', data: Array.from(new TextEncoder().encode(t('receive.startedSaving'))) });
    } catch {
      updateReceive(session.id, { saveToFile: false });
    }
  };

  const appendLineToFile = (line: string) => {
    const handle = fileHandleRef.current;
    if (!handle) {
      return;
    }

    writeChainRef.current = writeChainRef.current
      .then(async () => {
        const file = await handle.getFile();
        const writer = await handle.createWritable({ keepExistingData: true });
        await writer.write({ type: 'write', position: file.size, data: line });
        await writer.close();
      })
      .catch(() => {});
  };

  React.useEffect(() => {
    const flushToFile = () => {
      const st = useAppStore.getState();
      const live = st.sessions.find(s => s.id === session.id);
      if (!live || !live.receiveSettings.saveToFile || !fileHandleRef.current || live.logs.length === 0) {
        return;
      }

      const asciiMode = live.receiveSettings.asciiNonPrintable ?? 'DOT';
      const pendingRecvLines: string[] = [];

      for (const log of live.logs) {
        if (log.id <= lastSavedLogIdRef.current) {
          continue;
        }
        if (log.direction !== 'recv') {
          continue;
        }
        const line = `[${formatTimestamp(log.timestamp)}] RECV: ${
          bytesToDisplay(log.data, live.receiveSettings.encoding, asciiMode)
        }\n`;
        pendingRecvLines.push(line);
      }

      lastSavedLogIdRef.current = live.logs[live.logs.length - 1]?.id ?? lastSavedLogIdRef.current;
      if (pendingRecvLines.length > 0) {
        appendLineToFile(pendingRecvLines.join(''));
      }
    };

    const timer = setInterval(flushToFile, 120);
    return () => {
      clearInterval(timer);
      flushToFile();
    };
  }, [session.id]);

  const exportLog = () => {
    const asciiMode = receiveSettings.asciiNonPrintable ?? 'DOT';
    const lines = session.logs.map(e => {
      const ts   = formatTimestamp(e.timestamp);
      const dir  = e.direction.toUpperCase();
      const text = bytesToDisplay(e.data, receiveSettings.encoding, asciiMode);
      return `[${ts}] ${dir}: ${text}`;
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `log_${Date.now()}.txt` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const showRemote = ['TCP_CLIENT', 'UDP_CLIENT', 'WEBSOCKET'].includes(config.protocol);
  const showLocal  = ['TCP_SERVER', 'UDP_SERVER', 'UDP_CLIENT'].includes(config.protocol);
  const showWs     = config.protocol === 'WEBSOCKET';
  const isSrv      = config.protocol === 'TCP_SERVER';

  const btnColor = isActive ? 'rgba(248,113,113,0.8)' : 'var(--color-primary)';
  const btnBg    = isActive
    ? 'linear-gradient(to bottom,rgba(248,113,113,0.15),rgba(248,113,113,0.05))'
    : 'linear-gradient(to bottom,rgba(19,236,236,0.2),rgba(19,236,236,0.05))';

  const linkStyle = (color = 'var(--color-primary)'): React.CSSProperties => ({
    color, fontSize: 10, cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontFamily: 'var(--font-display)',
  });

  // Protocol options translated
  const PROTOCOLS: { value: ProtocolType; label: string }[] = [
    { value: 'TCP_CLIENT', label: t('protocol.TCP_CLIENT') },
    { value: 'TCP_SERVER', label: t('protocol.TCP_SERVER') },
    { value: 'UDP_CLIENT', label: t('protocol.UDP_CLIENT') },
    { value: 'UDP_SERVER', label: t('protocol.UDP_SERVER') },
    { value: 'WEBSOCKET',  label: t('protocol.WEBSOCKET')  },
    { value: 'SERIAL',     label: t('protocol.SERIAL')     },
  ];
  const RECEIVE_ENCODINGS: { value: EncodingMode; label: string }[] = [
    { value: 'AUTO', label: t('receive.modeAuto') },
    { value: 'HEX', label: t('receive.modeHex') },
    { value: 'HEX_TEXT', label: t('receive.modeHexText') },
    { value: 'UTF8', label: t('receive.modeUtf8') },
    { value: 'ASCII', label: t('receive.modeAscii') },
  ];
  const ASCII_NON_PRINTABLE: { value: AsciiNonPrintableMode; label: string }[] = [
    { value: 'DOT', label: t('receive.nonPrintableDot') },
    { value: 'HEX', label: t('receive.nonPrintableHex') },
  ];

  return (
    <>
      <PanelCard>
        <PanelHeader
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
          label={t('network.title')}
        />
        <div className="p-3 flex flex-col gap-3">
          <div>
            <FieldLabel seq={1} label={t('network.protocolType')} />
            <FieldSelect value={config.protocol} onChange={v => updateConfig(session.id, { protocol: v as ProtocolType })} options={PROTOCOLS} />
          </div>
          {showWs && (
            <div>
              <FieldLabel seq={2} label={t('network.wsUrl')} />
              <FieldInput value={config.wsUrl} onChange={v => updateConfig(session.id, { wsUrl: v })} placeholder="ws://127.0.0.1:8080" />
            </div>
          )}
          {isSrv && (
            <>
              <div><FieldLabel seq={2} label={t('network.listenAddress')} /><FieldInput value={config.localHost} onChange={v => updateConfig(session.id, { localHost: v })} placeholder="0.0.0.0" /></div>
              <div><FieldLabel seq={3} label={t('network.listenPort')} /><FieldInput value={String(config.localPort)} onChange={v => updateConfig(session.id, { localPort: Number(v) })} type="number" /></div>
            </>
          )}
          {showRemote && !showWs && (
            <>
              <div><FieldLabel seq={2} label={t('network.remoteIp')} /><FieldInput value={config.remoteHost} onChange={v => updateConfig(session.id, { remoteHost: v })} placeholder="127.0.0.1" /></div>
              <div><FieldLabel seq={3} label={t('network.remotePort')} /><FieldInput value={String(config.remotePort)} onChange={v => updateConfig(session.id, { remotePort: Number(v) })} type="number" /></div>
            </>
          )}
          {showLocal && !isSrv && (
            <div>
              <FieldLabel seq={4} label={t('network.localPort')} />
              <FieldInput value={String(config.localPort)} onChange={v => updateConfig(session.id, { localPort: Number(v) })} placeholder={t('network.localPortAuto')} type="number" />
            </div>
          )}
          <button
            onClick={handleConnect}
            disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 py-2 rounded font-bold uppercase tracking-wider"
            style={{ fontSize: 11, fontFamily: 'var(--font-display)', background: btnBg, border: `1px solid ${btnColor.replace('0.8', '0.25')}`, color: btnColor, boxShadow: `0 0 6px ${btnColor.replace('0.8', '0.06')}`, cursor: isBusy ? 'wait' : 'pointer', opacity: isBusy ? 0.7 : 1 }}
          >
            <span className="inline-block rounded-full" style={{ width: 7, height: 7, background: isActive ? 'rgba(248,113,113,0.8)' : '#334155', boxShadow: isActive ? '0 0 5px rgba(248,113,113,0.8)' : 'none' }} />
            {isActive ? t('network.disconnect') : isBusy ? t('network.connecting') : t('network.connect')}
          </button>
        </div>
      </PanelCard>

      <PanelCard>
        <PanelHeader
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29"/></svg>}
          label={t('receive.title')}
        />
        <div className="p-3 flex flex-col gap-2">
          <FieldSelect
            value={receiveSettings.encoding}
            onChange={v => updateReceive(session.id, { encoding: v as EncodingMode })}
            options={RECEIVE_ENCODINGS}
          />
          <FieldSelect
            value={receiveSettings.asciiNonPrintable ?? 'DOT'}
            onChange={v => updateReceive(session.id, { asciiNonPrintable: v as AsciiNonPrintableMode })}
            options={ASCII_NON_PRINTABLE}
          />
          <div className="flex flex-col gap-1.5">
            <CheckRow checked={receiveSettings.showAsLog}      onChange={v => updateReceive(session.id, { showAsLog: v })}      label={t('receive.showAsLog')} />
            <CheckRow checked={receiveSettings.autoNewline}    onChange={v => updateReceive(session.id, { autoNewline: v })}    label={t('receive.autoNewline')} />
            <CheckRow checked={receiveSettings.saveToFile}     onChange={handleSaveToFile}                                      label={t('receive.saveToFile')} />
            <CheckRow checked={receiveSettings.pauseReceiving} onChange={v => updateReceive(session.id, { pauseReceiving: v })} label={t('receive.pauseReceiving')} />
          </div>
          <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(19,236,236,0.1)' }}>
            <button style={linkStyle()} onClick={exportLog}>{t('receive.exportLog')}</button>
            <button style={linkStyle()} onClick={() => clearLogs(session.id)}>{t('receive.clearRx')}</button>
          </div>
        </div>
      </PanelCard>

      <PanelCard>
        <PanelHeader
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}
          label={t('sendSettings.title')}
        />
        <div className="p-3 flex flex-col gap-2">
          <RadioGroup options={['ASCII', 'HEX']} value={sendSettings.encoding} onChange={v => updateSend(session.id, { encoding: v as 'ASCII' | 'HEX' })} accent />
          <div className="flex flex-col gap-1.5">
            <CheckRow checked={sendSettings.autoParseEscapes} onChange={v => updateSend(session.id, { autoParseEscapes: v })} label={t('sendSettings.autoEscapes')}  accent />
            <CheckRow checked={sendSettings.autoCRLF}         onChange={v => updateSend(session.id, { autoCRLF: v })}         label={t('sendSettings.autoCRLF')}      accent />
            <CheckRow checked={sendSettings.autoChecksum}     onChange={v => updateSend(session.id, { autoChecksum: v })}     label={t('sendSettings.autoChecksum')}  accent />
            {sendSettings.autoChecksum && (
              <FieldSelect
                value={sendSettings.checksumType}
                onChange={v => updateSend(session.id, { checksumType: v as 'CRC16' | 'LRC' | 'SUM8' })}
                options={[{ value: 'CRC16', label: 'CRC16 Modbus' }, { value: 'LRC', label: 'LRC' }, { value: 'SUM8', label: 'Checksum-8' }]}
              />
            )}
            <div className="flex items-center gap-2 mt-1 p-1.5 rounded" style={{ background: 'rgba(16,34,34,0.3)', border: '1px solid rgba(19,236,236,0.05)' }}>
              <input type="checkbox" className="custom-check accent" checked={sendSettings.periodicEnabled} onChange={e => updateSend(session.id, { periodicEnabled: e.target.checked })} />
              <span style={{ fontSize: 11, color: '#cbd5e1' }}>{t('sendSettings.periodic')}</span>
              <input type="text" value={sendSettings.periodicInterval} onChange={e => updateSend(session.id, { periodicInterval: Number(e.target.value) })} className="field-control text-center" style={{ width: 52, padding: '2px 4px', height: 24, fontSize: 10 }} />
              <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--font-mono)' }}>ms</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(19,236,236,0.1)' }}>
            <button style={linkStyle('var(--color-accent)')} onClick={() => { setShowShortcuts(v => !v); setShowHistory(false); }}>{t('sendSettings.quickShortcuts')}</button>
            <button style={linkStyle('var(--color-accent)')} onClick={() => { setShowHistory(v => !v); setShowShortcuts(false); }}>{t('sendSettings.sendHistory')}</button>
          </div>
        </div>

        {showShortcuts && (
          <div style={{ borderTop: '1px solid rgba(19,236,236,0.1)' }}>
            <QuickShortcutsPanel onSend={(text, enc) => sendPanelBus.emit(text, enc)} />
          </div>
        )}

        {showHistory && (
          <div style={{ borderTop: '1px solid rgba(19,236,236,0.1)' }}>
            <SendHistoryPanel
              history={session.sendHistory}
              onSelect={(text) => { sendPanelBus.emit(text, sendSettings.encoding); setShowHistory(false); }}
            />
          </div>
        )}
      </PanelCard>
    </>
  );
}
