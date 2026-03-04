import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '../../utils/tauri';
import { useAppStore } from '../../store';
import { sendPanelBus } from '../sidebar/ConnectionPanel';
import type { Session } from '../../types';
import { asciiToBytes, hexToBytes, parseEscapeSequences } from '../../utils/encoding';
import { appendChecksum } from '../../utils/checksum';

interface Props { session: Session }

export default function DataSend({ session }: Props) {
  const { t } = useTranslation();
  const [text, setText]         = useState('');
  const appendLog               = useAppStore(s => s.appendLog);
  const addTxBytes              = useAppStore(s => s.addTxBytes);
  const addSendHistory          = useAppStore(s => s.addSendHistory);
  const fileInputRef            = useRef<HTMLInputElement>(null);
  const periodicRef             = useRef<ReturnType<typeof setInterval> | null>(null);

  const { sendSettings } = session;
  const canSend = session.status === 'connected' || session.status === 'listening';

  const stopPeriodic = () => {
    if (periodicRef.current) {
      clearInterval(periodicRef.current);
      periodicRef.current = null;
    }
  };

  // Subscribe to shortcut / history bus
  useEffect(() => {
    const unsub = sendPanelBus.on((t) => setText(t));
    return unsub;
  }, []);

  const buildPayload = (input: string): number[] => {
    if (sendSettings.encoding === 'HEX') {
      let b = hexToBytes(input);
      if (sendSettings.autoChecksum) b = appendChecksum(b, sendSettings.checksumType);
      return b;
    }
    let s = input;
    if (sendSettings.autoParseEscapes) s = parseEscapeSequences(s);
    if (sendSettings.autoCRLF && !s.endsWith('\r\n')) s += '\r\n';
    let b = asciiToBytes(s);
    if (sendSettings.autoChecksum) b = appendChecksum(b, sendSettings.checksumType);
    return b;
  };

  const doSend = async (overrideText?: string) => {
    const raw = overrideText ?? text;
    if (!canSend || !raw.trim()) return;
    const payload = buildPayload(raw);
    if (payload.length === 0) return;
    try {
      await invoke('send_data', { id: session.id, data: payload });
      appendLog(session.id, { timestamp: Date.now(), direction: 'send', data: payload });
      addTxBytes(session.id, payload.length);
      addSendHistory(session.id, raw.trim());
    } catch (e) {
      appendLog(session.id, { timestamp: Date.now(), direction: 'system', data: Array.from(new TextEncoder().encode(`${t('send.sendFailed')}: ${e}`)) });
    }
  };

  // Periodic send
  useEffect(() => {
    stopPeriodic();

    if (sendSettings.periodicEnabled && canSend) {
      periodicRef.current = setInterval(() => doSend(), sendSettings.periodicInterval);
    }

    return () => { stopPeriodic(); };
  }, [sendSettings.periodicEnabled, sendSettings.periodicInterval, canSend, text]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); doSend(); }
  };

  // Open File Data Source
  const handleFileOpen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result;
      if (typeof content === 'string') {
        setText(content);
      } else if (content instanceof ArrayBuffer) {
        // Binary file → show as hex
        const bytes = Array.from(new Uint8Array(content));
        setText(bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' '));
      }
    };
    if (sendSettings.encoding === 'HEX') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  return (
    <div style={{ background: 'rgba(22,46,46,0.8)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5"
        style={{ background: 'linear-gradient(to right,rgba(19,236,236,0.1),transparent)', borderBottom: '1px solid rgba(19,236,236,0.2)' }}>
        <div className="flex items-center gap-2" style={{ borderLeft: '2px solid var(--color-primary)', paddingLeft: 8 }}>
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#e2e8f0', fontFamily: 'var(--font-display)' }}>{t('send.title')}</h3>
        </div>
        <div className="flex items-center gap-3">
          {/* Open File */}
          <button
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: '#64748b', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
            onClick={() => fileInputRef.current?.click()}
            title={t('send.openFile')}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span style={{ fontSize: 10 }}>{t('send.openFile')}</span>
          </button>
          <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileOpen} />

          {/* Clear */}
          <button
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: '#64748b', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
            onClick={() => setText('')}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
            </svg>
            <span style={{ fontSize: 10 }}>{t('send.clear')}</span>
          </button>
        </div>
      </div>

      {/* Input row */}
      <div className="flex gap-2 p-2" style={{ background: 'rgba(16,34,34,0.8)' }}>
        <div className="flex-1 rounded transition-all"
          style={{ border: '1px solid rgba(19,236,236,0.3)', boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.5)', background: 'var(--color-bg-dark)' }}
          onFocusCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)'; }}
          onBlurCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(19,236,236,0.3)'; }}
        >
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={sendSettings.encoding === 'HEX' ? t('send.hexPlaceholder') : t('send.asciiPlaceholder')}
            spellCheck={false}
            style={{ width: '100%', height: 76, background: 'transparent', border: 'none', padding: '8px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-primary)', resize: 'none', outline: 'none' }}
          />
        </div>

        {/* Send button */}
        <button
          onClick={() => doSend()}
          disabled={!canSend}
          className="w-24 shrink-0 flex flex-col items-center justify-center gap-1 rounded"
          style={{
            background: canSend ? 'linear-gradient(135deg,rgba(19,236,236,0.2),rgba(19,236,236,0.05))' : 'rgba(22,46,46,0.5)',
            border: `1px solid ${canSend ? 'rgba(19,236,236,0.5)' : 'rgba(19,236,236,0.1)'}`,
            boxShadow: canSend ? '0 0 15px rgba(19,236,236,0.1)' : 'none',
            color: canSend ? 'var(--color-primary)' : '#1e3a3a',
            cursor: canSend ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-display)',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em' }}>{t('send.sendBtn')}</span>
        </button>
      </div>
    </div>
  );
}
