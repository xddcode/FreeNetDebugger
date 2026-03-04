import React, { useRef, useMemo, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Plug, Clock } from 'lucide-react';
import { useAppStore } from '../../store';
import type { Session, LogEntry, EncodingMode, AsciiNonPrintableMode } from '../../types';
import {
  bytesToDisplay, bytesToHexText, formatTimestamp,
} from '../../utils/encoding';
import { APP_DISPLAY } from '../../config/app';

interface Props { session: Session }

function renderData(entry: LogEntry, encoding: EncodingMode, asciiMode: AsciiNonPrintableMode): string {
  return bytesToDisplay(entry.data, encoding, asciiMode);
}

const LogRow = memo(function LogRow({
  entry,
  encoding,
  asciiMode,
  dirRecv,
  dirSend,
  dirSystem,
}: {
  entry: LogEntry;
  encoding: EncodingMode;
  asciiMode: AsciiNonPrintableMode;
  dirRecv: string;
  dirSend: string;
  dirSystem: string;
}) {
  const isRecv = entry.direction === 'recv';
  const isSys  = entry.direction === 'system';

  const encLabel = encoding;
  const dirLabel = isSys ? `# ${dirSystem}` : isRecv ? `# ${dirRecv} ${encLabel}>` : `# ${dirSend} ${encLabel}>`;

  const dataColor = isSys
    ? '#94a3b8'
    : isRecv
    ? 'var(--color-success)'
    : 'var(--color-accent)';

  const text = renderData(entry, encoding, asciiMode);
  const dual = encoding === 'HEX_TEXT' ? bytesToHexText(entry.data, asciiMode) : null;

  return (
    <div className="px-3 py-1" style={{ fontFamily: 'var(--font-mono)' }}>
      <div style={{ color: '#475569', fontSize: 11 }}>
        [{formatTimestamp(entry.timestamp)}]
        {entry.source && ` [${entry.source}]`}
        {' '}{dirLabel}
      </div>
      {dual ? (
        <>
          <div style={{ color: dataColor, fontSize: 12, fontWeight: 600, marginTop: 2, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
            {dual.hex}
          </div>
          <div style={{ color: '#a8b3c7', fontSize: 11, marginTop: 2, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
            {dual.text}
          </div>
        </>
      ) : (
        <div style={{ color: dataColor, fontSize: 12, fontWeight: 600, marginTop: 2, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
          {text}
        </div>
      )}
    </div>
  );
}, (prev, next) =>
  prev.entry.id === next.entry.id &&
  prev.encoding === next.encoding &&
  prev.asciiMode === next.asciiMode &&
  prev.dirRecv === next.dirRecv &&
  prev.dirSend === next.dirSend &&
  prev.dirSystem === next.dirSystem,
);

export default function DataLog({ session }: Props) {
  const { t } = useTranslation();
  const logFilter    = useAppStore(s => s.logFilter);
  const setLogFilter = useAppStore(s => s.setLogFilter);
  const clearLogs    = useAppStore(s => s.clearLogs);

  const parentRef = useRef<HTMLDivElement>(null);
  const atBottom  = useRef(true);

  const asciiMode = session.receiveSettings.asciiNonPrintable ?? 'DOT';

  const filteredLogs = useMemo(() => {
    if (!logFilter.trim()) {
      return session.logs;
    }
    const q = logFilter.toLowerCase();
    return session.logs.filter(e =>
      renderData(e, session.receiveSettings.encoding, asciiMode).toLowerCase().includes(q),
    );
  }, [session.logs, logFilter, session.receiveSettings.encoding, asciiMode]);

  // Stable callbacks so virtualizer doesn't recreate on every render
  const getEstimateSize = useCallback(() => 50, []);
  const getItemKey      = useCallback(
    (i: number) => filteredLogs[i]?.id ?? i,
    [filteredLogs],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual uses interior mutability
  const virtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: getEstimateSize,
    getItemKey,
    overscan: 15,
  });

  // Auto-scroll to bottom when new data arrives and user hasn't scrolled up
  const prevCountRef = useRef(0);
  React.useEffect(() => {
    if (filteredLogs.length !== prevCountRef.current) {
      prevCountRef.current = filteredLogs.length;
      if (atBottom.current && filteredLogs.length > 0) {
        virtualizer.scrollToIndex(filteredLogs.length - 1, { align: 'end' });
      }
    }
  }, [filteredLogs.length, virtualizer]);

  const handleScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) {
      return;
    }
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  return (
    <div className="flex flex-col h-full" style={{ background: 'rgba(16,34,34,0.8)' }}>
      <div className="flex items-center justify-between px-3 py-1.5 shrink-0"
        style={{ background: 'linear-gradient(to right,rgba(19,236,236,0.1),transparent)', borderBottom: '1px solid rgba(19,236,236,0.2)' }}>
        <div className="flex items-center gap-2" style={{ borderLeft: '2px solid var(--color-primary)', paddingLeft: 8 }}>
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#e2e8f0', fontFamily: 'var(--font-display)' }}>
            {t('log.title')}
          </h3>
          {session.logs.length > 0 && (
            <span style={{ fontSize: 10, color: '#1e3a3a', fontFamily: 'var(--font-mono)' }}>
              {session.logs.length.toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(255,0,255,0.7)', fontWeight: 700 }}>
            {APP_DISPLAY}
          </span>
          <button
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase transition-colors"
            style={{ background: 'rgba(19,236,236,0.1)', border: '1px solid rgba(19,236,236,0.2)', color: 'var(--color-primary)', fontSize: 10 }}
            onClick={() => clearLogs(session.id)}
          >
            {t('log.clear')}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 shrink-0"
        style={{ background: 'rgba(16,34,34,0.5)', borderBottom: '1px solid rgba(19,236,236,0.1)' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(100,116,139,0.8)" strokeWidth="2" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={logFilter}
          onChange={e => setLogFilter(e.target.value)}
          placeholder={t('log.searchPlaceholder')}
          style={{ flex: 1, background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(19,236,236,0.2)', borderRadius: 4, padding: '4px 8px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', outline: 'none', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}
          onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(19,236,236,0.2)')}
        />
        {logFilter && (
          <button onClick={() => setLogFilter('')} style={{ color: '#64748b', fontSize: 14, lineHeight: 1 }}>×</button>
        )}
      </div>

      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto relative"
        onScroll={handleScroll}
        style={{ background: 'rgba(16,34,34,0.95)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)' }}
      >
        <div className="crt-scanlines" />

        {filteredLogs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-3 h-full relative z-20"
            style={{
              color: 'rgba(100,116,139,0.9)',
              fontSize: 13,
              fontFamily: 'var(--font-mono)',
              background: 'rgba(16,34,34,0.32)',
            }}
          >
            {session.status === 'idle' || session.status === 'error' ? (
              <Plug size={48} strokeWidth={1.2} style={{ opacity: 0.5 }} />
            ) : (
              <Clock size={48} strokeWidth={1.2} style={{ opacity: 0.5 }} />
            )}
            <span>
              {session.status === 'idle' || session.status === 'error'
                ? t('log.connectFirst')
                : t('log.waiting')}
            </span>
          </div>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative', zIndex: 20 }}>
            {virtualizer.getVirtualItems().map(vItem => (
              <div
                key={vItem.key}
                data-index={vItem.index}
                ref={virtualizer.measureElement}
                style={{ position: 'absolute', top: vItem.start, left: 0, right: 0 }}
              >
                <LogRow
                  entry={filteredLogs[vItem.index]}
                  encoding={session.receiveSettings.encoding}
                  asciiMode={asciiMode}
                  dirRecv={t('log.dirRecv')}
                  dirSend={t('log.dirSend')}
                  dirSystem={t('log.dirSystem')}
                />
              </div>
            ))}
          </div>
        )}

        {(session.status === 'connected' || session.status === 'listening') && (
          <div className="relative z-20 px-3 pb-2"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', fontWeight: 700 }}>
            <span className="blink">_</span>
          </div>
        )}
      </div>
    </div>
  );
}
