import { useTranslation } from 'react-i18next';
import { useSessionStore } from '../../store';
import type { Session } from '../../types';
import { PanelCard, PanelHeader } from './ui';

interface Props {
  session: Session;
}

export default function HttpPanel({ session }: Props) {
  const { t } = useTranslation();
  const updateConfig = useSessionStore(s => s.updateConfig);
  const isActive = session.status === 'connected';
  const isBusy = session.status === 'connecting' || session.status === 'disconnecting';

  const { httpHeaders } = session.config;

  const addHeader = () => {
    updateConfig(session.id, {
      httpHeaders: [...httpHeaders, { key: '', value: '', enabled: true }],
    });
  };

  const updateHeader = (index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    const next = httpHeaders.map((h, i) =>
      i === index ? { ...h, [field]: value } : h
    );
    updateConfig(session.id, { httpHeaders: next });
  };

  const removeHeader = (index: number) => {
    const next = httpHeaders.filter((_, i) => i !== index);
    updateConfig(session.id, { httpHeaders: next });
  };

  return (
    <PanelCard>
      <PanelHeader
        icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        label={t('http.headers')}
      />
      <div className="p-3 flex flex-col gap-1.5">
        {httpHeaders.map((h, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              type="checkbox"
              className="custom-check accent"
              checked={h.enabled}
              onChange={e => updateHeader(i, 'enabled', e.target.checked)}
              disabled={isActive || isBusy}
            />
            <input
              type="text"
              value={h.key}
              onChange={e => updateHeader(i, 'key', e.target.value)}
              placeholder="Header"
              disabled={isActive || isBusy}
              className="field-control flex-1 min-w-0 text-[11px] px-2 py-1"
            />
            <input
              type="text"
              value={h.value}
              onChange={e => updateHeader(i, 'value', e.target.value)}
              placeholder="Value"
              disabled={isActive || isBusy}
              className="field-control flex-1 min-w-0 text-[11px] px-2 py-1"
            />
            <button
              onClick={() => removeHeader(i)}
              disabled={isActive || isBusy}
              className="text-[var(--color-error)]/70 hover:text-[var(--color-error)] text-xs px-1 btn-interactive disabled:opacity-50"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={addHeader}
          disabled={isActive || isBusy}
          className="text-[10px] text-[var(--color-primary)] btn-interactive focus-ring text-left font-[family-name:var(--font-mono)] disabled:opacity-50"
        >
          + {t('shortcuts.add')}
        </button>
      </div>
    </PanelCard>
  );
}
