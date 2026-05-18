import React, { useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '../../utils/tauri';
import { useSessionStore } from '../../store';
import { sendPanelBus } from '../../utils/sendPanelBus';
import type { EncodingMode, Session } from '../../types';
import type { SendCenterTabKey } from './SendCenterDrawer';
import { asciiToBytes, hexToBytes, parseEscapeSequences } from '../../utils/encoding';
import { appendChecksum } from '../../utils/checksum';

interface Props {
  session: Session;
  onOpenSendCenter?: (tab: SendCenterTabKey) => void;
}

export default function DataSend({ session, onOpenSendCenter }: Props) {
  const { t } = useTranslation();
  const text                    = session.sendContent;
  const updateSendContent        = useSessionStore(s => s.updateSendContent);
  const updateSendSettings       = useSessionStore(s => s.updateSendSettings);
  const appendLog                = useSessionStore(s => s.appendLog);
  const addSendHistory           = useSessionStore(s => s.addSendHistory);
  const fileInputRef             = useRef<HTMLInputElement>(null);
  const periodicRef              = useRef<number | null>(null);

  const setText = (v: string) => updateSendContent(session.id, v);

  const { sendSettings } = session;
  const canSend = session.status === 'connected' || session.status === 'listening';

  const stopPeriodic = () => {
    if (periodicRef.current !== null) {
      clearInterval(periodicRef.current);
      periodicRef.current = null;
    }
  };

  const buildPayload = useCallback((input: string, overrideEncoding?: EncodingMode): number[] => {
    const mode = overrideEncoding === 'HEX' || overrideEncoding === 'ASCII'
      ? overrideEncoding
      : sendSettings.encoding;
    if (mode === 'HEX') {
      let b = hexToBytes(input);
      if (sendSettings.autoChecksum) {
        b = appendChecksum(b, sendSettings.checksumType);
      }
      return b;
    }
    let s = input;
    if (sendSettings.autoParseEscapes) {
      s = parseEscapeSequences(s);
    }
    if (sendSettings.autoCRLF && !s.endsWith('\r\n')) {
      s += '\r\n';
    }
    let b = asciiToBytes(s);
    if (sendSettings.autoChecksum) {
      b = appendChecksum(b, sendSettings.checksumType);
    }
    return b;
  }, [sendSettings]);

  const doSend = useCallback(async (overrideText?: string, overrideEncoding?: EncodingMode) => {
    const raw = overrideText ?? text;
    if (!canSend || !raw.trim()) {
      return;
    }
    const payload = buildPayload(raw, overrideEncoding);
    if (payload.length === 0) {
      return;
    }
    try {
      await invoke('send_data', { id: session.id, data: payload });
      appendLog(session.id, { timestamp: Date.now(), direction: 'send', data: payload });
      addSendHistory(session.id, raw.trim());
    } catch (e) {
      appendLog(session.id, { timestamp: Date.now(), direction: 'system', data: Array.from(new TextEncoder().encode(`${t('send.sendFailed')}: ${e}`)) });
    }
  }, [text, canSend, session.id, buildPayload, appendLog, addSendHistory, t]);

  // Subscribe to shortcut / history bus
  useEffect(() => {
    const unsub = sendPanelBus.on((nextText, enc, sendNow, append) => {
      const effectiveEncoding: 'ASCII' | 'HEX' = enc === 'HEX' ? 'HEX' : 'ASCII';
      if (effectiveEncoding !== sendSettings.encoding) {
        updateSendSettings(session.id, { encoding: effectiveEncoding });
      }
      const mergedText = append
        ? (() => {
          const current = useSessionStore.getState().sessions.find(s => s.id === session.id)?.sendContent ?? '';
          if (!current.trim()) {
            return nextText;
          }
          const separator = effectiveEncoding === 'HEX' ? ' ' : '\n';
          return `${current}${separator}${nextText}`;
        })()
        : nextText;

      updateSendContent(session.id, mergedText);
      if (sendNow) {
        void doSend(mergedText, effectiveEncoding);
      }
    });
    return unsub;
  }, [session.id, updateSendContent, updateSendSettings, doSend, sendSettings.encoding]);

  // Periodic send
  useEffect(() => {
    stopPeriodic();

    if (sendSettings.periodicEnabled && canSend) {
      periodicRef.current = setInterval(() => doSend(), sendSettings.periodicInterval);
    }

    return () => { stopPeriodic(); };
  }, [sendSettings.periodicEnabled, sendSettings.periodicInterval, canSend, doSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); doSend(); }
  };

  // Open File Data Source
  const handleFileOpen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
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

  const sendBtnClass = canSend
    ? 'bg-[linear-gradient(135deg,rgba(45,212,191,0.2),rgba(45,212,191,0.05))] border border-[var(--color-primary)]/50 shadow-[0_0_15px_rgba(45,212,191,0.1)] text-[var(--color-primary)] cursor-pointer'
    : 'bg-[var(--color-surface)]/50 border border-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed';

  return (
    <div className="bg-[var(--color-surface)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[linear-gradient(to_right,rgba(45,212,191,0.1),transparent)] border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2 border-l-2 border-[var(--color-primary)] pl-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">{t('send.title')}</h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            data-send-center-trigger="true"
            className="px-2 py-0.5 rounded text-xs btn-interactive hover:bg-white/5 focus-ring text-[var(--color-secondary)] border border-[var(--color-secondary)]/20"
            onClick={() => onOpenSendCenter?.('shortcuts')}
            title={t('sendSettings.quickShortcuts')}
          >
            {t('sendSettings.quickShortcuts')}
          </button>
          <button
            data-send-center-trigger="true"
            className="px-2 py-0.5 rounded text-xs btn-interactive hover:bg-white/5 focus-ring text-[var(--color-primary)] border border-[var(--color-primary)]/20"
            onClick={() => onOpenSendCenter?.('history')}
            title={t('sendSettings.sendHistory')}
          >
            {t('sendSettings.sendHistory')}
          </button>
          {/* Open File */}
          <button
            className="flex items-center gap-1 text-xs btn-interactive hover-text-primary focus-ring text-[var(--color-text-muted)]"
            onClick={() => fileInputRef.current?.click()}
            title={t('send.openFile')}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span className="text-[10px]">{t('send.openFile')}</span>
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileOpen} />

          {/* Clear */}
          <button
            className="flex items-center gap-1 text-xs btn-interactive hover-text-primary focus-ring text-[var(--color-text-muted)]"
            onClick={() => updateSendContent(session.id, '')}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
            </svg>
            <span className="text-[10px]">{t('send.clear')}</span>
          </button>
        </div>
      </div>

      {/* Input row */}
      <div className="flex gap-2 p-2 bg-[var(--color-bg)]">
        <div className="flex-1 rounded transition-all border border-[var(--color-border)] shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] bg-[var(--color-bg)] focus-within:border-[var(--color-primary)]"
        >
          <textarea
            value={text ?? ''}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={sendSettings.encoding === 'HEX' ? t('send.hexPlaceholder') : t('send.asciiPlaceholder')}
            spellCheck={false}
            className="w-full h-[76px] bg-transparent border-0 p-2 font-[family-name:var(--font-mono)] text-xs text-[var(--color-primary)] resize-none outline-none"
          />
        </div>

        {/* Send button */}
        <button
          onClick={() => doSend()}
          disabled={!canSend}
          className={`w-24 shrink-0 flex flex-col items-center justify-center gap-1 rounded btn-interactive focus-ring disabled:opacity-50 font-[family-name:var(--font-body)] ${sendBtnClass}`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
          <span className="text-[11px] font-bold tracking-[0.15em]">{t('send.sendBtn')}</span>
        </button>
      </div>
    </div>
  );
}
