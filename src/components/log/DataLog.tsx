import React, { useRef, useMemo, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Plug, Clock } from 'lucide-react';
import { useSessionStore, useLogStore } from '../../store';
import type { Session, LogEntry, EncodingMode, AsciiNonPrintableMode } from '../../types';
import {
  bytesToDisplay, bytesToHexText, formatTimestamp,
} from '../../utils/encoding';
import { APP_DISPLAY } from '../../config/app';
import { LOG_VIRTUALIZER_OVERSCAN, LOG_ESTIMATE_SIZE, LOG_SCROLL_BOTTOM_THRESHOLD } from '../../config/constants';

interface Props { session: Session }

function renderData(entry: LogEntry, encoding: EncodingMode, asciiMode: AsciiNonPrintableMode): string {
  return bytesToDisplay(entry.data, encoding, asciiMode);
}

const LogRow = memo(function LogRow({
  entry,
  encoding,
  asciiMode,
  showAsLog,
  autoNewline,
  dirRecv,
  dirSend,
  dirSystem,
}: {
  entry: LogEntry;
  encoding: EncodingMode;
  asciiMode: AsciiNonPrintableMode;
  showAsLog: boolean;
  autoNewline: boolean;
  dirRecv: string;
  dirSend: string;
  dirSystem: string;
}) {
  const isRecv = entry.direction === 'recv';
  const isSys  = entry.direction === 'system';

  const encLabel = encoding;
  const dirLabel = isSys ? `# ${dirSystem}` : isRecv ? `# ${dirRecv} ${encLabel}>` : `# ${dirSend} ${encLabel}>`;

  const dataColorClass = isSys
    ? 'text-[var(--color-text-muted)]'
    : isRecv
    ? 'text-[var(--color-success)]'
    : 'text-[var(--color-accent)]';

  const suffix = isRecv && autoNewline ? '\n' : '';
  const text = renderData(entry, encoding, asciiMode) + suffix;
  const dual = encoding === 'HEX_TEXT' ? bytesToHexText(entry.data, asciiMode) : null;
  const hexText = dual ? `${dual.hex}${suffix}` : null;
  const plainText = dual ? `${dual.text}${suffix}` : null;

  if (!showAsLog) {
    return (
      <div className="px-3 py-0.5 font-[family-name:var(--font-mono)]">
        {dual ? (
          <>
            <div className={`text-xs font-semibold break-all whitespace-pre-wrap ${dataColorClass}`}>
              {hexText}
            </div>
            <div className="text-[11px] mt-px text-[var(--color-text-secondary)] break-all whitespace-pre-wrap">
              {plainText}
            </div>
          </>
        ) : (
          <div className={`text-xs font-semibold break-all whitespace-pre-wrap ${dataColorClass}`}>
            {text}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-3 py-1 font-[family-name:var(--font-mono)]">
      <div className="text-[11px] text-[var(--color-text-muted)]">
        [{formatTimestamp(entry.timestamp)}]
        {entry.source && ` [${entry.source}]`}
        {' '}{dirLabel}
      </div>
      {dual ? (
        <>
          <div className={`text-xs font-semibold mt-0.5 break-all whitespace-pre-wrap ${dataColorClass}`}>
            {hexText}
          </div>
          <div className="text-[11px] mt-0.5 text-[var(--color-text-secondary)] break-all whitespace-pre-wrap">
            {plainText}
          </div>
        </>
      ) : (
        <div className={`text-xs font-semibold mt-0.5 break-all whitespace-pre-wrap ${dataColorClass}`}>
          {text}
        </div>
      )}
    </div>
  );
}, (prev, next) =>
  prev.entry.id === next.entry.id &&
  prev.encoding === next.encoding &&
  prev.asciiMode === next.asciiMode &&
  prev.showAsLog === next.showAsLog &&
  prev.autoNewline === next.autoNewline &&
  prev.dirRecv === next.dirRecv &&
  prev.dirSend === next.dirSend &&
  prev.dirSystem === next.dirSystem,
);

export default function DataLog({ session }: Props) {
  const { t } = useTranslation();
  const logFilter    = useLogStore(s => s.logFilter);
  const setLogFilter = useLogStore(s => s.setLogFilter);
  const clearLogs    = useSessionStore(s => s.clearLogs);

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
  const getEstimateSize = useCallback(() => LOG_ESTIMATE_SIZE, []);
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
    overscan: LOG_VIRTUALIZER_OVERSCAN,
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
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < LOG_SCROLL_BOTTOM_THRESHOLD;
  }, []);

  return (
    <div className="flex flex-col h-full bg-[rgba(16,34,34,0.8)] select-text"
    >
      <div className="flex items-center justify-between px-3 py-1.5 shrink-0 bg-[linear-gradient(to_right,rgba(45,212,191,0.1),transparent)] border-b border-[var(--color-primary)]/20"
      >
        <div className="flex items-center gap-2 border-l-2 border-[var(--color-primary)] pl-2"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)] font-[family-name:var(--font-display)]">
            {t('log.title')}
          </h3>
          {session.logs.length > 0 && (
            <span className="text-[10px] text-[var(--color-text-muted)] font-[family-name:var(--font-mono)]"
            >
              {session.logs.length.toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3"
        >
          <span className="text-[10px] font-[family-name:var(--font-mono)] text-[var(--color-secondary)]/70 font-bold"
          >
            {APP_DISPLAY}
          </span>
          <button
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase btn-interactive hover:bg-white/10 focus-ring bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] text-[10px]"
            onClick={() => clearLogs(session.id)}
          >
            {t('log.clear')}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 shrink-0 bg-[rgba(16,34,34,0.5)] border-b border-[var(--color-primary)]/10"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(100,116,139,0.8)" strokeWidth="2" className="shrink-0"
        >
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={logFilter}
          onChange={e => setLogFilter(e.target.value)}
          placeholder={t('log.searchPlaceholder')}
          className="field-control flex-1 min-w-0"
        />
        {logFilter && (
          <button onClick={() => setLogFilter('')} className="btn-interactive hover-text-primary focus-ring px-1 text-[var(--color-text-muted)] text-sm leading-none" aria-label={t('log.clear')}>×</button>
        )}
      </div>

      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto relative bg-[rgba(16,34,34,0.95)] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] select-text"
        onScroll={handleScroll}
      >
        <div className="crt-scanlines" />

        {filteredLogs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-3 h-full relative z-20 text-[var(--color-text-muted)]/90 text-[13px] font-[family-name:var(--font-mono)] bg-[rgba(16,34,34,0.32)]"
          >
            {session.status === 'idle' || session.status === 'error' ? (
              <Plug size={48} strokeWidth={1.2} className="opacity-50" />
            ) : (
              <Clock size={48} strokeWidth={1.2} className="opacity-50" />
            )}
            <span>
              {session.status === 'idle' || session.status === 'error'
                ? t('log.connectFirst')
                : t('log.waiting')}
            </span>
          </div>
        ) : (
          <div className="relative z-20" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map(vItem => (
              <div
                key={vItem.key}
                data-index={vItem.index}
                ref={virtualizer.measureElement}
                className="absolute inset-x-0"
                style={{ top: vItem.start }}
              >
                <LogRow
                  entry={filteredLogs[vItem.index]}
                  encoding={session.receiveSettings.encoding}
                  asciiMode={asciiMode}
                  showAsLog={session.receiveSettings.showAsLog}
                  autoNewline={session.receiveSettings.autoNewline}
                  dirRecv={t('log.dirRecv')}
                  dirSend={t('log.dirSend')}
                  dirSystem={t('log.dirSystem')}
                />
              </div>
            ))}
          </div>
        )}

        {(session.status === 'connected' || session.status === 'listening') && (
          <div className="relative z-20 px-3 pb-2 font-[family-name:var(--font-mono)] text-[var(--color-primary)] font-bold"
          >
            <span className="blink">_</span>
          </div>
        )}
      </div>
    </div>
  );
}
