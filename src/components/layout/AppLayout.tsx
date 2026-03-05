import type { ReactNode } from 'react';
import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { openUrl } from '@tauri-apps/plugin-opener';
import i18n from '../../i18n';
import { useAppStore, getActiveSession } from '../../store';
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
  const c = { connected: '#00ff00', listening: '#13ecec', connecting: '#fbbf24', error: '#f87171' }[status]
    ?? 'rgba(19,236,236,0.2)';
  return <span className="inline-block rounded-full shrink-0" style={{ width: 6, height: 6, background: c, boxShadow: `0 0 5px ${c}` }} />;
}

export default function AppLayout() {
  const { t } = useTranslation();

  const sessions      = useAppStore(s => s.sessions);
  const activeId      = useAppStore(s => s.activeSessionId);
  const setActive     = useAppStore(s => s.setActiveSession);
  const addSession    = useAppStore(s => s.addSession);
  const removeSession = useAppStore(s => s.removeSession);
  const activeSession = useAppStore(s => getActiveSession(s));
  const locale        = useAppStore(s => s.locale);
  const setLocale     = useAppStore(s => s.setLocale);

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
    const live = useAppStore.getState().sessions.find(s => s.id === id);
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
  const btn = (onClick: () => void, icon: ReactNode, title: string) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="w-11 h-10 flex items-center justify-center transition-colors hover:bg-white/10"
      style={{ color: 'var(--color-primary)' }}
    >
      {icon}
    </button>
  );

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden hex-grid brushed-metal">

      <header
        className="relative z-20 flex items-center justify-between pl-4 pr-0 py-0 shrink-0 select-none"
        style={{
          height: 40,
          background: 'rgba(16,34,34,0.95)',
          borderBottom: '1px solid rgba(19,236,236,0.2)',
        }}
      >
        {/* 左侧：图标+标题+空白 可拖拽 */}
        <div
          data-tauri-drag-region
          className="flex items-center gap-2 flex-1 min-w-0 cursor-move"
          style={{ color: 'var(--color-primary)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="3"/>
            <circle cx="4" cy="6" r="2"/><circle cx="20" cy="6" r="2"/>
            <circle cx="4" cy="18" r="2"/><circle cx="20" cy="18" r="2"/>
            <line x1="12" y1="9" x2="5" y2="7"/><line x1="12" y1="9" x2="19" y2="7"/>
            <line x1="12" y1="15" x2="5" y2="17"/><line x1="12" y1="15" x2="19" y2="17"/>
          </svg>
          <h1 className="text-sm font-bold tracking-tight uppercase" style={{ fontFamily: 'var(--font-display)' }}>
            {APP.name}
          </h1>
        </div>
        {/* 右侧：菜单+状态+按钮 可点击 */}
        <div className="flex items-center gap-4 shrink-0" style={{ color: 'var(--color-primary)' }}>
          <div className="relative flex items-center gap-0.5">
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setMenuOpen(m => !m); }}
              className="px-2 py-1 text-xs hover:bg-white/10 rounded"
            >
              帮助
            </button>
            <button
              type="button"
              onClick={() => openUrl(APP.github)}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              title="GitHub"
              style={{ color: 'var(--color-primary)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </button>
            {menuOpen && (
              <div
                onClick={e => e.stopPropagation()}
                className="absolute left-0 top-full mt-1 py-1 rounded shadow-lg z-50 min-w-[160px]"
                style={{
                  background: 'rgba(22,46,46,0.98)',
                  border: '1px solid rgba(19,236,236,0.3)',
                }}
              >
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-xs hover:bg-white/10"
                  onClick={() => { setMenuOpen(false); setAboutOpen(true); }}
                >
                  关于 {APP.name}
                </button>
              </div>
            )}
          </div>

          <div
            className="flex items-center gap-2 px-2 py-0.5 rounded mr-2"
            style={{
              background: 'rgba(19,236,236,0.1)',
              border: '1px solid rgba(19,236,236,0.3)',
            }}
          >
            <span
              className="inline-block rounded-full"
              style={{
                width: 6, height: 6,
                background: 'var(--color-primary)',
                boxShadow: '0 0 4px #13ecec',
                animation: isAlive ? 'pulse-glow 2s ease-in-out infinite' : 'none',
              }}
            />
            <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
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
            className="px-2 py-0.5 text-xs rounded hover:bg-white/10 mr-2"
            style={{ color: sendCenterOpen ? 'var(--color-accent)' : 'var(--color-primary)' }}
            title={t('sendCenter.title')}
          >
            {t('sendCenter.title')}
          </button>

          <button
            onClick={handleToggleLang}
            className="px-2 py-0.5 text-xs rounded hover:bg-white/10 mr-2"
            style={{ color: 'var(--color-primary)' }}
            title={locale === 'en' ? '切换为中文' : 'Switch to English'}
          >
            {locale === 'en' ? '中文' : 'EN'}
          </button>

          {btn(() => win.minimize(), <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>, '最小化')}
          {btn(() => win.toggleMaximize(), <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="1"/></svg>, '最大化')}
          {btn(() => win.close(), <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>, '关闭')}
        </div>
      </header>

      <div
        className="relative z-10 flex items-center gap-1.5 px-3 shrink-0 overflow-x-auto"
        style={{ height: 40, background: 'rgba(16,34,34,0.95)', borderBottom: '1px solid rgba(19,236,236,0.1)' }}
      >
        {sessions.map(sess => {
          const active = sess.id === activeId;
          return (
            <div
              key={sess.id}
              className="flex items-center gap-1.5 px-3 rounded cursor-pointer shrink-0 group transition-all"
              style={{
                height: 28, fontSize: 11, fontFamily: 'var(--font-mono)',
                background: active ? 'rgba(19,236,236,0.12)' : 'transparent',
                border: active ? '1px solid rgba(19,236,236,0.4)' : '1px solid transparent',
                color: active ? 'var(--color-primary)' : '#64748b',
              }}
              onClick={() => setActive(sess.id)}
            >
              <SessionDot status={sess.status} />
              <span>{t(`protocol.${sess.config.protocol}`)}</span>
              {sessions.length > 1 && (
                <span
                  className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  style={{ color: '#64748b', fontSize: 13 }}
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
          className="px-2 rounded shrink-0"
          style={{ height: 28, fontSize: 14, color: '#475569', border: '1px dashed rgba(19,236,236,0.15)' }}
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
              className="w-full flex items-center justify-between px-3 py-2 transition-colors"
              style={{
                background: 'linear-gradient(to right, rgba(255,0,255,0.08), transparent)',
                borderBottom: trafficOpen ? '1px solid rgba(19,236,236,0.15)' : 'none',
              }}
              onClick={() => setTrafficOpen(o => !o)}
            >
              <div className="flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6"  y1="20" x2="6"  y2="14"/>
                </svg>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}>
                  {t('traffic.title')}
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

          <div className="shrink-0 neon-card overflow-hidden">
            {activeSession && <DataSend session={activeSession} onOpenSendCenter={openSendCenter} />}
          </div>
        </section>

        <div
          ref={sendCenterPanelRef}
          className="shrink-0 min-h-0 overflow-hidden"
          style={{ width: sendCenterOpen ? 340 : 0, transition: 'width 0.2s ease' }}
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
