import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '../../utils/tauri';
import { useSessionStore } from '../../store';
import type { Session, ProtocolType } from '../../types';
import { isValidIPv4, isValidPort, isValidWsUrl } from '../../utils/validation';
import { useSerialPorts } from '../../hooks/useSerialPorts';
import { PanelCard, PanelHeader, FieldLabel, FieldInput, FieldSelect } from './ui';

interface Props {
  session: Session;
}

export default function NetworkPanel({ session }: Props) {
  const { t } = useTranslation();
  const updateConfig = useSessionStore(s => s.updateConfig);
  const setStatus = useSessionStore(s => s.setStatus);
  const appendLog = useSessionStore(s => s.appendLog);

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const { ports, loading: portsLoading, refresh: refreshPorts } = useSerialPorts();

  const { config } = session;
  const isActive = session.status === 'connected' || session.status === 'listening';
  const isBusy = session.status === 'connecting' || session.status === 'disconnecting';

  const validate = (field: string, valid: boolean) => {
    setErrors(prev => (prev[field] === valid ? prev : { ...prev, [field]: !valid }));
  };

  const handleConnect = async () => {
    if (isActive || isBusy) {
      try {
        await invoke('disconnect', { id: session.id });
      } catch (e) {
        setStatus(session.id, 'error', String(e));
        appendLog(session.id, {
          timestamp: Date.now(),
          direction: 'system',
          data: Array.from(new TextEncoder().encode(`Disconnect error: ${e}`)),
        });
      }
      return;
    }

    const newErrors: Record<string, boolean> = {};
    const showRemote = ['TCP_CLIENT', 'UDP_CLIENT', 'WEBSOCKET'].includes(config.protocol);
    const showLocal = ['TCP_SERVER', 'UDP_SERVER', 'UDP_CLIENT'].includes(config.protocol);
    const showWs = config.protocol === 'WEBSOCKET';
    const isSrv = config.protocol === 'TCP_SERVER';
    const isSerial = config.protocol === 'SERIAL';
    const isHttp = config.protocol === 'HTTP';

    if (showRemote && !showWs) {
      newErrors.remoteHost = !isValidIPv4(config.remoteHost);
      newErrors.remotePort = !isValidPort(config.remotePort);
    }
    if (isSrv) {
      newErrors.localHost = !isValidIPv4(config.localHost);
      newErrors.localPort = !isValidPort(config.localPort);
    }
    if (showLocal && !isSrv) {
      newErrors.localPort = !isValidPort(config.localPort, true);
    }
    if (showWs) {
      newErrors.wsUrl = !isValidWsUrl(config.wsUrl);
    }
    if (isSerial) {
      newErrors.serialPort = !config.serialPort;
    }
    if (isHttp) {
      newErrors.httpUrl = !config.httpUrl || !config.httpUrl.startsWith('http');
    }

    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) {
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
      serial_port: proto === 'SERIAL' ? config.serialPort : undefined,
      baud_rate: proto === 'SERIAL' ? config.baudRate : undefined,
      data_bits: proto === 'SERIAL' ? config.dataBits : undefined,
      stop_bits: proto === 'SERIAL' ? config.stopBits : undefined,
      parity: proto === 'SERIAL' ? config.parity : undefined,
      http_url: proto === 'HTTP' ? config.httpUrl : undefined,
      http_method: proto === 'HTTP' ? config.httpMethod : undefined,
      http_headers: proto === 'HTTP' ? config.httpHeaders : undefined,
      http_body: proto === 'HTTP' ? config.httpBody : undefined,
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
  const isSerial = config.protocol === 'SERIAL';
  const isHttp = config.protocol === 'HTTP';

  const btnClass = isActive
    ? 'bg-[linear-gradient(to_bottom,rgba(248,113,113,0.12),rgba(248,113,113,0.04))] border border-[rgba(248,113,113,0.2)] text-[rgba(248,113,113,0.85)]'
    : 'bg-[linear-gradient(to_bottom,rgba(45,212,191,0.15),rgba(45,212,191,0.04))] border border-[rgba(45,212,191,0.2)] text-[var(--color-primary)]';

  const PROTOCOLS: { value: ProtocolType; label: string }[] = [
    { value: 'TCP_CLIENT', label: t('protocol.TCP_CLIENT') },
    { value: 'TCP_SERVER', label: t('protocol.TCP_SERVER') },
    { value: 'UDP_CLIENT', label: t('protocol.UDP_CLIENT') },
    { value: 'UDP_SERVER', label: t('protocol.UDP_SERVER') },
    { value: 'WEBSOCKET', label: t('protocol.WEBSOCKET') },
    { value: 'SERIAL', label: t('protocol.SERIAL') },
    { value: 'HTTP', label: 'HTTP' },
  ];

  const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];
  const DATA_BITS: { value: string; label: string }[] = [
    { value: '5', label: '5' }, { value: '6', label: '6' },
    { value: '7', label: '7' }, { value: '8', label: '8' },
  ];
  const STOP_BITS: { value: string; label: string }[] = [
    { value: '1', label: '1' }, { value: '2', label: '2' },
  ];
  const PARITY: { value: string; label: string }[] = [
    { value: 'none', label: t('serial.parityNone') },
    { value: 'odd', label: t('serial.parityOdd') },
    { value: 'even', label: t('serial.parityEven') },
  ];

  const portOptions = ports.map(p => ({ value: p, label: p }));

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
              onChange={v => { updateConfig(session.id, { wsUrl: v }); validate('wsUrl', isValidWsUrl(v)); }}
              placeholder="ws://127.0.0.1:8080"
              disabled={isActive || isBusy}
              error={errors.wsUrl}
            />
            {errors.wsUrl && <span className="text-[11px] text-[var(--color-error)] mt-1 block">{t('validation.invalidWsUrl')}</span>}
          </div>
        )}
        {isSrv && (
          <>
            <div>
              <FieldLabel seq={2} label={t('network.listenAddress')} />
              <FieldInput
                value={config.localHost}
                onChange={v => { updateConfig(session.id, { localHost: v }); validate('localHost', isValidIPv4(v)); }}
                placeholder="0.0.0.0"
                disabled={isActive || isBusy}
                error={errors.localHost}
              />
              {errors.localHost && <span className="text-[11px] text-[var(--color-error)] mt-1 block">{t('validation.invalidIp')}</span>}
            </div>
            <div>
              <FieldLabel seq={3} label={t('network.listenPort')} />
              <FieldInput
                value={String(config.localPort)}
                onChange={v => { updateConfig(session.id, { localPort: Number(v) }); validate('localPort', isValidPort(Number(v))); }}
                type="number"
                disabled={isActive || isBusy}
                error={errors.localPort}
              />
              {errors.localPort && <span className="text-[11px] text-[var(--color-error)] mt-1 block">{t('validation.invalidPort')}</span>}
            </div>
          </>
        )}
        {showRemote && !showWs && (
          <>
            <div>
              <FieldLabel seq={2} label={t('network.remoteIp')} />
              <FieldInput
                value={config.remoteHost}
                onChange={v => { updateConfig(session.id, { remoteHost: v }); validate('remoteHost', isValidIPv4(v)); }}
                placeholder="127.0.0.1"
                disabled={isActive || isBusy}
                error={errors.remoteHost}
              />
              {errors.remoteHost && <span className="text-[11px] text-[var(--color-error)] mt-1 block">{t('validation.invalidIp')}</span>}
            </div>
            <div>
              <FieldLabel seq={3} label={t('network.remotePort')} />
              <FieldInput
                value={String(config.remotePort)}
                onChange={v => { updateConfig(session.id, { remotePort: Number(v) }); validate('remotePort', isValidPort(Number(v))); }}
                type="number"
                disabled={isActive || isBusy}
                error={errors.remotePort}
              />
              {errors.remotePort && <span className="text-[11px] text-[var(--color-error)] mt-1 block">{t('validation.invalidPort')}</span>}
            </div>
          </>
        )}
        {showLocal && !isSrv && (
          <div>
            <FieldLabel seq={4} label={t('network.localPort')} />
            <FieldInput
              value={String(config.localPort)}
              onChange={v => { updateConfig(session.id, { localPort: Number(v) }); validate('localPort', isValidPort(Number(v), true)); }}
              placeholder={t('network.localPortAuto')}
              type="number"
              disabled={isActive || isBusy}
              error={errors.localPort}
            />
            {errors.localPort && <span className="text-[11px] text-[var(--color-error)] mt-1 block">{t('validation.invalidPort')}</span>}
          </div>
        )}
        {isSerial && (
          <>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <FieldLabel seq={2} label={t('serial.port')} />
                <FieldSelect
                  value={config.serialPort}
                  onChange={v => updateConfig(session.id, { serialPort: v })}
                  options={portOptions.length > 0 ? portOptions : [{ value: '', label: t('serial.noPorts') }]}
                  disabled={isActive || isBusy || portsLoading}
                />
              </div>
              <button
                onClick={refreshPorts}
                disabled={portsLoading}
                className="px-2 py-1.5 rounded text-[11px] btn-interactive focus-ring border border-[var(--color-primary)]/20 text-[var(--color-primary)] font-[family-name:var(--font-mono)] disabled:opacity-50"
              >
                {portsLoading ? '...' : t('serial.refresh')}
              </button>
            </div>
            {errors.serialPort && <span className="text-[11px] text-[var(--color-error)] mt-1 block">{t('serial.selectPort')}</span>}
            <div>
              <FieldLabel seq={3} label={t('serial.baudRate')} />
              <FieldSelect
                value={String(config.baudRate)}
                onChange={v => updateConfig(session.id, { baudRate: Number(v) })}
                options={BAUD_RATES.map(b => ({ value: String(b), label: String(b) }))}
                disabled={isActive || isBusy}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <FieldLabel label={t('serial.dataBits')} />
                <FieldSelect
                  value={String(config.dataBits)}
                  onChange={v => updateConfig(session.id, { dataBits: Number(v) as 5 | 6 | 7 | 8 })}
                  options={DATA_BITS}
                  disabled={isActive || isBusy}
                />
              </div>
              <div>
                <FieldLabel label={t('serial.stopBits')} />
                <FieldSelect
                  value={String(config.stopBits)}
                  onChange={v => updateConfig(session.id, { stopBits: Number(v) as 1 | 2 })}
                  options={STOP_BITS}
                  disabled={isActive || isBusy}
                />
              </div>
              <div>
                <FieldLabel label={t('serial.parity')} />
                <FieldSelect
                  value={config.parity}
                  onChange={v => updateConfig(session.id, { parity: v as 'none' | 'odd' | 'even' })}
                  options={PARITY}
                  disabled={isActive || isBusy}
                />
              </div>
            </div>
          </>
        )}
        {isHttp && (
          <>
            <div className="flex items-end gap-2">
              <div className="w-[110px]">
                <FieldLabel seq={2} label={t('http.method')} />
                <FieldSelect
                  value={config.httpMethod}
                  onChange={v => updateConfig(session.id, { httpMethod: v as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' })}
                  options={[
                    { value: 'GET', label: 'GET' },
                    { value: 'POST', label: 'POST' },
                    { value: 'PUT', label: 'PUT' },
                    { value: 'DELETE', label: 'DELETE' },
                    { value: 'PATCH', label: 'PATCH' },
                    { value: 'HEAD', label: 'HEAD' },
                    { value: 'OPTIONS', label: 'OPTIONS' },
                  ]}
                  disabled={isActive || isBusy}
                />
              </div>
              <div className="flex-1">
                <FieldLabel seq={3} label={t('http.url')} />
                <FieldInput
                  value={config.httpUrl}
                  onChange={v => { updateConfig(session.id, { httpUrl: v }); validate('httpUrl', !!v && v.startsWith('http')); }}
                  placeholder="https://api.example.com"
                  disabled={isActive || isBusy}
                  error={errors.httpUrl}
                />
              </div>
            </div>
            {errors.httpUrl && <span className="text-[11px] text-[var(--color-error)] mt-1 block">{t('http.invalidUrl')}</span>}
          </>
        )}
        <button
          onClick={handleConnect}
          disabled={isBusy}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded font-bold uppercase tracking-wider btn-interactive focus-ring disabled:opacity-70 disabled:cursor-wait text-[12px] font-[family-name:var(--font-display)] ${btnClass}`}
        >
          <span className={`inline-block rounded-full w-[7px] h-[7px] ${isActive ? 'bg-[rgba(248,113,113,0.8)] shadow-[0_0_5px_rgba(248,113,113,0.8)]' : 'bg-[#334155]'}`} />
          {isActive ? t('network.disconnect') : isBusy ? t('network.connecting') : t('network.connect')}
        </button>
      </div>
    </PanelCard>
  );
}
