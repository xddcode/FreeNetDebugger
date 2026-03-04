import { useEffect, useState } from 'react';
import { useAppStore, getActiveSession } from '../../store';
import ConnectionPanel from '../sidebar/ConnectionPanel';
import DataLog from '../log/DataLog';
import DataSend from '../send/DataSend';
import StatusBar from '../status/StatusBar';
import TrafficChart from '../traffic/TrafficChart';

const PROTOCOL_LABELS: Record<string, string> = {
  TCP_CLIENT: 'TCP Client', TCP_SERVER: 'TCP Server',
  UDP_CLIENT: 'UDP Client', UDP_SERVER: 'UDP Server',
  WEBSOCKET: 'WebSocket',  SERIAL: 'Serial Port',
};

function SessionDot({ status }: { status: string }) {
  const c = { connected: '#00ff00', listening: '#13ecec', connecting: '#fbbf24', error: '#f87171' }[status]
    ?? 'rgba(19,236,236,0.2)';
  return <span className="inline-block rounded-full shrink-0" style={{ width: 6, height: 6, background: c, boxShadow: `0 0 5px ${c}` }} />;
}

export default function AppLayout() {
  const sessions      = useAppStore(s => s.sessions);
  const activeId      = useAppStore(s => s.activeSessionId);
  const setActive     = useAppStore(s => s.setActiveSession);
  const addSession    = useAppStore(s => s.addSession);
  const removeSession = useAppStore(s => s.removeSession);
  const activeSession = useAppStore(s => getActiveSession(s));

  const [trafficOpen, setTrafficOpen] = useState(true);

  useEffect(() => {
    if (!activeId && sessions.length > 0) setActive(sessions[0].id);
  }, []);

  const isAlive = activeSession?.status === 'connected' || activeSession?.status === 'listening';

  const statusLabel = () => {
    const m: Record<string, string> = {
      idle: 'READY', connecting: 'CONNECTING', connected: 'CONNECTED',
      listening: 'LISTENING', error: 'ERROR', disconnecting: 'CLOSING',
    };
    return m[activeSession?.status ?? 'idle'] ?? 'READY';
  };

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden hex-grid brushed-metal">

      {/* ── Header ─────────────────────────────────────────── */}
      <header
        className="relative z-20 flex items-center justify-between px-6 py-2 shrink-0"
        style={{
          background: 'rgba(16,34,34,0.9)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(19,236,236,0.2)',
          boxShadow: '0 4px 20px rgba(19,236,236,0.1)',
        }}
      >
        <div className="flex items-center gap-3" style={{ color: 'var(--color-primary)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="3"/>
            <circle cx="4" cy="6" r="2"/><circle cx="20" cy="6" r="2"/>
            <circle cx="4" cy="18" r="2"/><circle cx="20" cy="18" r="2"/>
            <line x1="12" y1="9" x2="5" y2="7"/><line x1="12" y1="9" x2="19" y2="7"/>
            <line x1="12" y1="15" x2="5" y2="17"/><line x1="12" y1="15" x2="19" y2="17"/>
          </svg>
          <h1 className="text-base font-bold tracking-tight uppercase" style={{ fontFamily: 'var(--font-display)' }}>
            NetDebugger <span style={{ color: 'var(--color-accent)' }}>Pro</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-3 py-1 rounded"
            style={{
              background: 'rgba(19,236,236,0.1)',
              border: '1px solid rgba(19,236,236,0.3)',
              boxShadow: '0 0 10px rgba(19,236,236,0.2)',
            }}
          >
            <span
              className="inline-block rounded-full"
              style={{
                width: 8, height: 8,
                background: 'var(--color-primary)',
                boxShadow: '0 0 5px #13ecec',
                animation: isAlive ? 'pulse-glow 2s ease-in-out infinite' : 'none',
              }}
            />
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', letterSpacing: '0.08em' }}>
              Status: {statusLabel()}
            </span>
          </div>

          <button
            className="p-1.5 rounded transition-all"
            style={{ color: '#94a3b8' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── Session Tabs ───────────────────────────────────── */}
      <div
        className="relative z-10 flex items-center gap-1.5 px-3 shrink-0 overflow-x-auto"
        style={{
          height: 36,
          background: 'rgba(16,34,34,0.95)',
          borderBottom: '1px solid rgba(19,236,236,0.1)',
        }}
      >
        {sessions.map(sess => {
          const active = sess.id === activeId;
          return (
            <div
              key={sess.id}
              className="flex items-center gap-1.5 px-3 rounded cursor-pointer shrink-0 group transition-all"
              style={{
                height: 26, fontSize: 11, fontFamily: 'var(--font-mono)',
                background: active ? 'rgba(19,236,236,0.12)' : 'transparent',
                border: active ? '1px solid rgba(19,236,236,0.4)' : '1px solid transparent',
                color: active ? 'var(--color-primary)' : '#64748b',
              }}
              onClick={() => setActive(sess.id)}
            >
              <SessionDot status={sess.status} />
              <span>{PROTOCOL_LABELS[sess.config.protocol] ?? sess.name}</span>
              {sessions.length > 1 && (
                <span
                  className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: '#64748b', fontSize: 13 }}
                  onClick={e => { e.stopPropagation(); removeSession(sess.id); }}
                >×</span>
              )}
            </div>
          );
        })}
        <button
          className="px-2 rounded shrink-0"
          style={{ height: 26, fontSize: 14, color: '#475569', border: '1px dashed rgba(19,236,236,0.15)' }}
          onClick={() => addSession()}
          title="New Session"
        >+</button>
      </div>

      {/* ── Main Body ──────────────────────────────────────── */}
      <main className="relative z-10 flex flex-1 min-h-0 gap-2 p-2 overflow-hidden">

        {/* Left sidebar — 3 separate cards */}
        <aside className="w-64 shrink-0 flex flex-col gap-2 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {activeSession && <ConnectionPanel session={activeSession} />}
        </aside>

        {/* Right content column */}
        <section className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">

          {/* Data Log — flex-1 */}
          <div className="flex-1 min-h-0 neon-card flex flex-col overflow-hidden">
            {activeSession && <DataLog session={activeSession} />}
          </div>

          {/* Traffic Analysis — collapsible */}
          <div className="shrink-0 neon-card overflow-hidden">
            {/* Header */}
            <button
              className="w-full flex items-center justify-between px-3 py-2 transition-colors"
              style={{
                background: 'linear-gradient(to right, rgba(255,0,255,0.08), transparent)',
                borderBottom: trafficOpen ? '1px solid rgba(19,236,236,0.15)' : 'none',
              }}
              onClick={() => setTrafficOpen(o => !o)}
            >
              <div className="flex items-center gap-2">
                {/* bar-chart icon */}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-accent)" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6"  y1="20" x2="6"  y2="14"/>
                </svg>
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}
                >
                  Traffic Analysis
                </span>
              </div>
              <svg
                width="12" height="12" viewBox="0 0 12 12"
                fill="none" stroke="rgba(19,236,236,0.4)" strokeWidth="1.5"
                style={{ transform: trafficOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
              >
                <polyline points="2,4 6,8 10,4" />
              </svg>
            </button>

            {trafficOpen && activeSession && (
              <TrafficChart samples={activeSession.trafficSamples} />
            )}
          </div>

          {/* Data Send */}
          <div className="shrink-0 neon-card overflow-hidden">
            {activeSession && <DataSend session={activeSession} />}
          </div>
        </section>
      </main>

      {/* ── Status Bar ─────────────────────────────────────── */}
      <StatusBar session={activeSession} />
    </div>
  );
}
