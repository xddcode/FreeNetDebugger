import { useAppStore } from '../../store';
import type { Session } from '../../types';

interface Props { session: Session | null }

function fmt(n: number): string {
  if (n < 1024) return `${n}`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}K`;
  return `${(n / 1024 / 1024).toFixed(2)}M`;
}

export default function StatusBar({ session }: Props) {
  const resetCounts = useAppStore(s => s.resetCounts);

  const isReady   = !session || session.status === 'idle';
  const isConn    = session?.status === 'connected';
  const isListen  = session?.status === 'listening';
  const isError   = session?.status === 'error';

  const statusLabel = () => {
    if (!session || isReady) return 'Ready!';
    const m: Record<string, string> = {
      connecting: 'Connecting...', connected: 'Connected',
      listening: 'Listening', error: 'Error', disconnecting: 'Closing...',
    };
    return m[session.status] ?? 'Ready!';
  };

  const statusColor = isError
    ? '#f87171'
    : isConn || isListen
    ? 'var(--color-primary)'
    : '#94a3b8';

  const addrText = () => {
    if (!session) return '';
    const { config, remoteAddr } = session;
    if (remoteAddr) return remoteAddr;
    if (['TCP_CLIENT', 'UDP_CLIENT'].includes(config.protocol))
      return `${config.remoteHost}:${config.remotePort}`;
    if (['TCP_SERVER', 'UDP_SERVER'].includes(config.protocol))
      return `${config.localHost}:${config.localPort}`;
    if (config.protocol === 'WEBSOCKET') return config.wsUrl;
    return '';
  };

  return (
    <footer
      className="relative z-20 flex items-center justify-between px-4 py-1.5 shrink-0"
      style={{
        background: 'var(--color-bg-dark)',
        borderTop: '1px solid rgba(19,236,236,0.3)',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.5)',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: '#94a3b8',
      }}
    >
      {/* Left: status + address */}
      <div className="flex items-center gap-4">
        <span
          className="flex items-center gap-1.5 px-2 py-0.5 rounded"
          style={{
            background: 'rgba(19,236,236,0.1)',
            border: '1px solid rgba(19,236,236,0.2)',
          }}
        >
          {/* link icon */}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="var(--color-primary)" strokeWidth="2">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
          </svg>
          <span style={{ color: statusColor, fontWeight: 700 }}>{statusLabel()}</span>
        </span>

        {addrText() && (
          <>
            <div style={{ width: 1, height: 14, background: 'rgba(19,236,236,0.2)' }} />
            <span style={{ color: '#475569' }}>{addrText()}</span>
          </>
        )}
      </div>

      {/* Right: rx/tx counters */}
      {session && (
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1">
            RX:{' '}
            <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>
              {fmt(session.rxBytes)}
            </span>
          </span>
          <span className="flex items-center gap-1">
            TX:{' '}
            <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
              {fmt(session.txBytes)}
            </span>
          </span>
          <button
            onClick={() => resetCounts(session.id)}
            className="px-2 py-0.5 rounded uppercase transition-colors"
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#94a3b8',
              fontSize: 9,
              letterSpacing: '0.05em',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#293548')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1e293b')}
          >
            Reset Counts
          </button>
        </div>
      )}
    </footer>
  );
}
