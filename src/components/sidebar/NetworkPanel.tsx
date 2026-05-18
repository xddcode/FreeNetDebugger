import { useTranslation } from 'react-i18next';
import { invoke } from '../../utils/tauri';
import { useSessionStore } from '../../store';
import type { Session, ProtocolType } from '../../types';
import { PanelCard, PanelHeader, FieldLabel, FieldInput, FieldSelect } from './ui';

interface Props {
  session: Session;
}

export default function NetworkPanel({ session }: Props) {
  const { t } = useTranslation();
  const updateConfig = useSessionStore(s => s.updateConfig);
  const setStatus = useSessionStore(s => s.setStatus);
  const appendLog = useSessionStore(s => s.appendLog);

  const { config } = session;
  const isActive = session.status === 'connected' || session.status === 'listening';
  const isBusy = session.status === 'connecting' || session.status === 'disconnecting';

  const handleConnect = async () => {
    if (isActive || isBusy) {
      await invoke('disconnect', { id: session.id });
      return;
    }
    const proto = config.protocol;
    const cfg = {
      protocol: proto,
      remote_host: config.remoteHost || undefined,
      remote_port: config.remotePort || undefined,
      local_port: config.localPort || undefined,
      local_host: config.localHost || undefined,
      ws_url: proto === 'WEBSOCKET' ? config.wsUrl : undefined,
    };
    try {
      setStatus(session.id, 'connecting');
      await invoke('connect', { id: session.id, config: cfg });
    } catch (e) {
      setStatus(session.id, 'error', String(e));
      appendLog(session.id, {
        timestamp: Date.now(),
        direction: 'system',
        data: Array.from(new TextEncoder().encode(`ERROR: ${e}`)),
      });
    }
  };

  const showRemote = ['TCP_CLIENT', 'UDP_CLIENT', 'WEBSOCKET'].includes(config.protocol);
  const showLocal = ['TCP_SERVER', 'UDP_SERVER', 'UDP_CLIENT'].includes(config.protocol);
  const showWs = config.protocol === 'WEBSOCKET';
  const isSrv = config.protocol === 'TCP_SERVER';

  const btnClass = isActive
    ? 'bg-[linear-gradient(to_bottom,rgba(248,113,113,0.15),rgba(248,113,113,0.05))] border border-[rgba(248,113,113,0.25)] text-[rgba(248,113,113,0.8)] shadow-[0_0_6px_rgba(248,113,113,0.06)]'
    : 'bg-[linear-gradient(to_bottom,rgba(45,212,191,0.2),rgba(45,212,191,0.05))] border border-[rgba(45,212,191,0.25)] text-[var(--color-primary)] shadow-[0_0_6px_rgba(45,212,191,0.06)]';

  const PROTOCOLS: { value: ProtocolType; label: string }[] = [
    { value: 'TCP_CLIENT', label: t('protocol.TCP_CLIENT') },
    { value: 'TCP_SERVER', label: t('protocol.TCP_SERVER') },
    { value: 'UDP_CLIENT', label: t('protocol.UDP_CLIENT') },
    { value: 'UDP_SERVER', label: t('protocol.UDP_SERVER') },
    { value: 'WEBSOCKET', label: t('protocol.WEBSOCKET') },
    { value: 'SERIAL', label: t('protocol.SERIAL') },
  ];

  return (
    <PanelCard>
      <PanelHeader
        icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>}
        label={t('network.title')}
      />
      <div className="p-3 flex flex-col gap-3">
        <div>
          <FieldLabel seq={1} label={t('network.protocolType')} />
          <FieldSelect
            value={config.protocol}
            onChange={v => updateConfig(session.id, { protocol: v as ProtocolType })}
            options={PROTOCOLS}
            disabled={isActive || isBusy}
          />
        </div>
        {showWs && (
          <div>
            <FieldLabel seq={2} label={t('network.wsUrl')} />
            <FieldInput
              value={config.wsUrl}
              onChange={v => updateConfig(session.id, { wsUrl: v })}
              placeholder="ws://127.0.0.1:8080"
              disabled={isActive || isBusy}
            />
          </div>
        )}
        {isSrv && (
          <>
            <div><FieldLabel seq={2} label={t('network.listenAddress')} /><FieldInput value={config.localHost} onChange={v => updateConfig(session.id, { localHost: v })} placeholder="0.0.0.0" disabled={isActive || isBusy} /></div>
            <div><FieldLabel seq={3} label={t('network.listenPort')} /><FieldInput value={String(config.localPort)} onChange={v => updateConfig(session.id, { localPort: Number(v) })} type="number" disabled={isActive || isBusy} /></div>
          </>
        )}
        {showRemote && !showWs && (
          <>
            <div><FieldLabel seq={2} label={t('network.remoteIp')} /><FieldInput value={config.remoteHost} onChange={v => updateConfig(session.id, { remoteHost: v })} placeholder="127.0.0.1" disabled={isActive || isBusy} /></div>
            <div><FieldLabel seq={3} label={t('network.remotePort')} /><FieldInput value={String(config.remotePort)} onChange={v => updateConfig(session.id, { remotePort: Number(v) })} type="number" disabled={isActive || isBusy} /></div>
          </>
        )}
        {showLocal && !isSrv && (
          <div>
            <FieldLabel seq={4} label={t('network.localPort')} />
            <FieldInput
              value={String(config.localPort)}
              onChange={v => updateConfig(session.id, { localPort: Number(v) })}
              placeholder={t('network.localPortAuto')}
              type="number"
              disabled={isActive || isBusy}
            />
          </div>
        )}
        <button
          onClick={handleConnect}
          disabled={isBusy}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded font-bold uppercase tracking-wider btn-interactive focus-ring disabled:opacity-70 disabled:cursor-wait text-[11px] font-[family-name:var(--font-display)] ${btnClass}`}
        >
          <span className={`inline-block rounded-full w-[7px] h-[7px] ${isActive ? 'bg-[rgba(248,113,113,0.8)] shadow-[0_0_5px_rgba(248,113,113,0.8)]' : 'bg-[#334155]'}`} />
          {isActive ? t('network.disconnect') : isBusy ? t('network.connecting') : t('network.connect')}
        </button>
      </div>
    </PanelCard>
  );
}
