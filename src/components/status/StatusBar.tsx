import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store';
import type { Session } from '../../types';

interface Props { session: Session | null }

function fmt(n: number): string {
  if (n < 1024) {
    return `${n} B`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(1)} KB`;
  }
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export default function StatusBar({ session }: Props) {
  const { t } = useTranslation();
  const resetCounts = useAppStore(s => s.resetCounts);
  const theme = useAppStore(s => s.theme);
  const setTheme = useAppStore(s => s.setTheme);

  const isConn   = session?.status === 'connected';
  const isListen = session?.status === 'listening';
  const isError  = session?.status === 'error';

  const statusLabel = () => {
    if (!session || session.status === 'idle') {
      return t('status.ready');
    }
    const m: Record<string, string> = {
      connecting:    t('status.connecting'),
      connected:     t('status.connected'),
      listening:     t('status.listening'),
      error:         t('status.error'),
      disconnecting: t('status.closing'),
    };
    return m[session.status] ?? t('status.ready');
  };

  const statusClass = isError
    ? 'text-[var(--color-error)]'
    : isConn || isListen
    ? 'text-[var(--color-primary)]'
    : 'text-[var(--color-text-secondary)]';

  const addrText = () => {
    if (!session) {
      return '';
    }
    const { config, remoteAddr } = session;
    if (remoteAddr) {
      return remoteAddr;
    }
    if (['TCP_CLIENT', 'UDP_CLIENT'].includes(config.protocol)) {
      return `${config.remoteHost}:${config.remotePort}`;
    }
    if (['TCP_SERVER', 'UDP_SERVER'].includes(config.protocol)) {
      return `${config.localHost}:${config.localPort}`;
    }
    if (config.protocol === 'WEBSOCKET') {
      return config.wsUrl;
    }
    return '';
  };

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <footer
      className="relative z-20 flex items-center justify-between px-4 py-1.5 shrink-0 bg-[var(--color-bg)] border-t border-[var(--color-border)] shadow-[0_-2px_10px_rgba(0,0,0,0.5)] font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-text-secondary)]"
    >
      <div className="flex items-center gap-4">
        <span
          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
          </svg>
          <span className={`font-bold ${statusClass}`}>{statusLabel()}</span>
        </span>

        {addrText() && (
          <>
            <div className="w-px h-3.5 bg-[var(--color-border)]" />
            <span className="text-[var(--color-text-muted)]">{addrText()}</span>
          </>
        )}
      </div>

      {session && (
        <div className="flex items-center gap-6">
          {/* Theme toggle */}
          <button
            onClick={handleToggleTheme}
            className="p-1 rounded btn-interactive hover:bg-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus-ring"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          <span className="flex items-center gap-1">
            {t('statusBar.rx')}:{' '}
            <span className="text-[var(--color-success)] font-bold">{fmt(session.rxBytes)}</span>
          </span>
          <span className="flex items-center gap-1">
            {t('statusBar.tx')}:{' '}
            <span className="text-[var(--color-secondary)] font-bold">{fmt(session.txBytes)}</span>
          </span>
          <button
            onClick={() => resetCounts(session.id)}
            className="px-2 py-0.5 rounded uppercase btn-interactive hover:bg-white/10 focus-ring bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text-secondary)] text-[9px] tracking-wider"
          >
            {t('statusBar.resetCounts')}
          </button>
        </div>
      )}
    </footer>
  );
}
