import type { ReactNode } from 'react';
import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { openUrl } from '@tauri-apps/plugin-opener';
import i18n from '../../i18n';
import { useSessionStore, useSettingsStore, getActiveSession } from '../../store';
import { invoke } from '../../utils/tauri';
import ConnectionPanel from '../sidebar/ConnectionPanel';
import DataLog from '../log/DataLog';
import DataSend from '../send/DataSend';
import SendCenterDrawer, { type SendCenterTabKey } from '../send/SendCenterDrawer';
import StatusBar from '../status/StatusBar';
import TrafficChart from '../traffic/TrafficChart';
import AboutDialog from '../AboutDialog';
import { APP } from '../../config/app';

function SessionDot({ status }: { status: string }) {
  const statusColorClass = {
    connected: 'bg-[var(--color-success)] shadow-[0_0_5px_var(--color-success)]',
    listening: 'bg-[var(--color-primary)] shadow-[0_0_5px_var(--color-primary)]',
    connecting: 'bg-[var(--color-warning)] shadow-[0_0_5px_var(--color-warning)]',
    error: 'bg-[var(--color-error)] shadow-[0_0_5px_var(--color-error)]',
  }[status] ?? 'bg-[var(--color-border)]';
  return <span className={`inline-block rounded-full w-1.5 h-1.5 shrink-0 ${statusColorClass}`} />;
}

export default function AppLayout() {
  const { t } = useTranslation();

  const sessions      = useSessionStore(s => s.sessions);
  const activeId      = useSessionStore(s => s.activeSessionId);
  const setActive     = useSessionStore(s => s.setActiveSession);
  const addSession    = useSessionStore(s => s.addSession);
  const removeSession = useSessionStore(s => s.removeSession);
  const activeSession = useSessionStore(s => getActiveSession(s));
  const locale        = useSettingsStore(s => s.locale);
  const setLocale     = useSettingsStore(s => s.setLocale);

  const [trafficOpen, setTrafficOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [sendCenterOpen, setSendCenterOpen] = useState(false);
  const [sendCenterTab, setSendCenterTab] = useState<SendCenterTabKey>('history');
  const sendCenterPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeId && sessions.length > 0) {
      setActive(sessions[0].id);
    }
  }, [activeId, sessions, setActive]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onDocClick = () => setMenuOpen(false);
    const id = window.setTimeout(() => document.addEventListener('click', onDocClick), 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('click', onDocClick);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!sendCenterOpen) {
      return;
    }
    const onDocMouseDown = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      if (!target) {
        return;
      }
      if (sendCenterPanelRef.current?.contains(target)) {
        return;
      }
      if (target.closest('[data-send-center-trigger="true"]')) {
        return;
      }
      setSendCenterOpen(false);
    };
    const onDocKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setSendCenterOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onDocKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onDocKeyDown);
    };
  }, [sendCenterOpen]);

  const isAlive = activeSession?.status === 'connected' || activeSession?.status === 'listening';

  const statusLabel = () => {
    const m: Record<string, string> = {
      idle:          t('status.ready'),
      connecting:    t('status.connecting'),
      connected:     t('status.connected'),
      listening:     t('status.listening'),
      error:         t('status.error'),
      disconnecting: t('status.closing'),
    };
    return m[activeSession?.status ?? 'idle'] ?? t('status.ready');
  };

  const handleToggleLang = () => {
    const next = locale === 'en' ? 'zh-CN' : 'en';
    setLocale(next);
    i18n.changeLanguage(next);
  };

  const handleCloseSession = async (id: string) => {
    const live = useSessionStore.getState().sessions.find(s => s.id === id);
    const shouldDisconnect = live && ['connecting', 'connected', 'listening', 'disconnecting'].includes(live.status);
    if (shouldDisconnect) {
      try {
        await invoke('disconnect', { id });
      } catch {
        // Ignore disconnection errors and still allow tab closure.
      }
    }
    removeSession(id);
  };

  const openSendCenter = (tab: SendCenterTabKey) => {
    setSendCenterTab(tab);
    setSendCenterOpen(true);
  };

  const win = getCurrentWindow();
  const winBtn = (onClick: () => void, icon: ReactNode, title: string) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="w-11 h-10 flex items-center justify-center btn-interactive rounded-sm hover:bg-white/10 focus-ring text-[var(--color-primary)]"
    >
      {icon}
    </button>
  );

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden hex-grid brushed-metal">

      <header
        className="relative z-20 flex items-center justify-between pl-4 pr-0 py-0 shrink-0 select-none h-10 bg-[var(--color-bg)]/95 border-b border-[var(--color-border)]"
      >
        {/* Left: icon + title + spacer (draggable) */}
        <div
          data-tauri-drag-region
          className="flex items-center gap-2 flex-1 min-w-0 cursor-move text-[var(--color-primary)]"
        >
          <span
            className="inline-flex items-center justify-center rounded shrink-0 w-6 h-6 bg-[linear-gradient(135deg,rgba(45,212,191,0.12),rgba(129,140,248,0.08))]"
          >
            <img src="/app-icon.png" alt="FreeNetDebugger" width="18" height="18" className="rounded shrink-0" />
          </span>
          <h1 className="text-sm font-bold tracking-tight uppercase">
            {APP.name}
          </h1>
        </div>
        {/* Right: menu + status + buttons (clickable) */}
        <div className="flex items-center gap-4 shrink-0 text-[var(--color-primary)]">
          <div className="relative flex items-center gap-0.5">
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setMenuOpen(m => !m); }}
              className="px-2 py-1 text-xs btn-interactive rounded hover:bg-white/10 focus-ring"
            >
              {t('header.help')}
            </button>
            <button
              type="button"
              onClick={() => openUrl(APP.github)}
              className="p-1 rounded btn-interactive hover:bg-white/10 focus-ring text-[var(--color-primary)]"
              title="GitHub"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </button>
            {menuOpen && (
              <div
                onClick={e => e.stopPropagation()}
                className="absolute left-0 top-full mt-1 py-1 rounded shadow-lg z-50 min-w-[160px] bg-[var(--color-surface)]/98 border border-[var(--color-border)]"
              >
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-xs btn-interactive hover:bg-white/10 rounded focus-ring"
              onClick={() => { setMenuOpen(false); setAboutOpen(true); }}
            >
              {t('header.about')} {APP.name}
            </button>
              </div>
            )}
          </div>

          <div
            className="flex items-center gap-2 px-2 py-0.5 rounded mr-2 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30"
          >
            <span
              className={`inline-block rounded-full w-1.5 h-1.5 bg-[var(--color-primary)] shadow-[0_0_4px_var(--color-primary)] ${isAlive ? 'animate-pulse' : ''}`}
            />
            <span className="text-[9px] font-[family-name:var(--font-mono)] text-[var(--color-primary)]">
              {statusLabel()}
            </span>
          </div>

          <button
            data-send-center-trigger="true"
            onClick={() => {
              if (sendCenterOpen) {
                setSendCenterOpen(false);
              } else {
                openSendCenter('history');
              }
            }}
            className={`px-2 py-0.5 text-xs rounded btn-interactive hover:bg-white/10 mr-2 focus-ring ${sendCenterOpen ? 'text-[var(--color-secondary)]' : 'text-[var(--color-primary)]'}`}
            title={t('sendCenter.title')}
          >
            {t('sendCenter.title')}
          </button>

          <button
            onClick={handleToggleLang}
            className="px-2 py-0.5 text-xs rounded btn-interactive hover:bg-white/10 mr-2 focus-ring text-[var(--color-primary)]"
            title={locale === 'en' ? '切换为中文' : 'Switch to English'}
          >
            {locale === 'en' ? '中文' : 'EN'}
          </button>

          {winBtn(() => win.minimize(), <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>, t('header.minimize'))}
          {winBtn(() => win.toggleMaximize(), <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="1"/></svg>, t('header.maximize'))}
          {winBtn(() => win.close(), <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>, t('header.close'))}
        </div>
      </header>

      <div
        className="relative z-10 flex items-center gap-1.5 px-3 shrink-0 overflow-x-auto h-10 bg-[var(--color-bg)]/95 border-b border-[var(--color-border)]"
      >
        {sessions.map(sess => {
          const active = sess.id === activeId;
          return (
            <div
              key={sess.id}
              role="button"
              tabIndex={0}
              className={`flex items-center gap-1.5 px-3 rounded shrink-0 group tab-interactive focus-ring h-7 text-[11px] font-[family-name:var(--font-mono)] ${active ? 'bg-[var(--color-primary)]/12 border border-[var(--color-primary)]/40 text-[var(--color-primary)]' : 'bg-transparent border border-transparent text-[var(--color-text-muted)]'}`}
              onClick={() => setActive(sess.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(sess.id); } }}
            >
              <SessionDot status={sess.status} />
              <span>{t(`protocol.${sess.config.protocol}`)}</span>
              {sessions.length > 1 && (
                <span
                  className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[var(--color-text-muted)] text-[13px]"
                  onClick={e => {
                    e.stopPropagation();
                    void handleCloseSession(sess.id);
                  }}
                >×</span>
              )}
            </div>
          );
        })}
        <button
          className="px-2 rounded shrink-0 btn-interactive hover:bg-white/5 focus-ring h-7 text-sm text-[var(--color-text-secondary)] border border-dashed border-[var(--color-border)]"
          onClick={() => addSession()}
          title={t('header.newSession')}
        >+</button>
      </div>

      <main className="relative z-10 flex flex-1 min-h-0 gap-2 p-2 overflow-hidden">

        <aside className="sidebar-scroll w-64 shrink-0 flex flex-col gap-2 min-h-0">
          {activeSession && <ConnectionPanel session={activeSession} />}
        </aside>

        <section className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">

          <div className="flex-1 min-h-0 neon-card flex flex-col overflow-hidden">
            {activeSession && <DataLog session={activeSession} />}
          </div>

          {/* Traffic — collapsible */}
          <div className="shrink-0 neon-card overflow-hidden">
            <button
              className={`w-full flex items-center justify-between px-3 py-2 btn-interactive bg-[linear-gradient(to_right,rgba(129,140,248,0.08),transparent)] ${trafficOpen ? 'border-b border-[var(--color-border)]' : ''}`}
              onClick={() => setTrafficOpen(o => !o)}
            >
              <div className="flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6"  y1="20" x2="6"  y2="14"/>
                </svg>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary)]">
                  {t('traffic.title')}
                </span>
              </div>
              <svg
                width="12" height="12" viewBox="0 0 12 12"
                fill="none" stroke="var(--color-border-focus)" strokeWidth="1.5"
                className={`transition-transform duration-200 ${trafficOpen ? 'rotate-180' : ''}`}
              >
                <polyline points="2,4 6,8 10,4" />
              </svg>
            </button>

            {trafficOpen && activeSession && (
              <TrafficChart samples={activeSession.trafficSamples} />
            )}
          </div>

          <div className="shrink-0 neon-card overflow-hidden">
            {activeSession && <DataSend session={activeSession} onOpenSendCenter={openSendCenter} />}
          </div>
        </section>

        <div
          ref={sendCenterPanelRef}
          className={`shrink-0 min-h-0 overflow-hidden transition-[width] duration-200 ${sendCenterOpen ? 'w-[340px]' : 'w-0'}`}
        >
          <SendCenterDrawer
            open={sendCenterOpen}
            session={activeSession}
            activeTab={sendCenterTab}
            onTabChange={setSendCenterTab}
            onClose={() => setSendCenterOpen(false)}
          />
        </div>
      </main>

      <StatusBar session={activeSession} />

      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
