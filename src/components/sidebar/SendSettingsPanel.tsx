import { useTranslation } from 'react-i18next';
import { useSessionStore } from '../../store';
import type { Session } from '../../types';
import { PanelCard, PanelHeader, FieldSelect, CheckRow, RadioGroup } from './ui';

interface Props {
  session: Session;
}

export default function SendSettingsPanel({ session }: Props) {
  const { t } = useTranslation();
  const updateSend = useSessionStore(s => s.updateSendSettings);
  const { sendSettings } = session;

  return (
    <PanelCard>
      <PanelHeader
        icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>}
        label={t('sendSettings.title')}
      />
      <div className="p-3 flex flex-col gap-2">
        <RadioGroup
          options={['ASCII', 'HEX']}
          value={sendSettings.encoding}
          onChange={v => updateSend(session.id, { encoding: v as 'ASCII' | 'HEX' })}
          accent
        />
        <div className="flex flex-col gap-1.5">
          <CheckRow checked={sendSettings.autoParseEscapes} onChange={v => updateSend(session.id, { autoParseEscapes: v })} label={t('sendSettings.autoEscapes')} accent />
          <CheckRow checked={sendSettings.autoCRLF} onChange={v => updateSend(session.id, { autoCRLF: v })} label={t('sendSettings.autoCRLF')} accent />
          <CheckRow checked={sendSettings.autoChecksum} onChange={v => updateSend(session.id, { autoChecksum: v })} label={t('sendSettings.autoChecksum')} accent />
          {sendSettings.autoChecksum && (
            <FieldSelect
              value={sendSettings.checksumType}
              onChange={v => updateSend(session.id, { checksumType: v as 'CRC8' | 'CRC16' | 'CRC32' | 'LRC' | 'XOR' | 'SUM8' })}
              options={[
                { value: 'CRC8', label: 'CRC-8' },
                { value: 'CRC16', label: 'CRC-16 Modbus' },
                { value: 'CRC32', label: 'CRC-32' },
                { value: 'LRC', label: 'LRC' },
                { value: 'XOR', label: 'XOR' },
                { value: 'SUM8', label: 'SUM-8' },
              ]}
            />
          )}
          <div className="flex items-center gap-2 mt-1 p-2 rounded bg-[rgba(16,34,34,0.3)] border border-[var(--color-primary)]/[0.05]">
            <input
              type="checkbox"
              className="custom-check accent"
              checked={sendSettings.periodicEnabled}
              onChange={e => updateSend(session.id, { periodicEnabled: e.target.checked })}
            />
            <span className="text-[12px] text-[var(--color-text-secondary)]">{t('sendSettings.periodic')}</span>
            <input
              type="text"
              value={sendSettings.periodicInterval}
              onChange={e => updateSend(session.id, { periodicInterval: Number(e.target.value) })}
              className="field-control text-center w-[56px] px-1 py-0.5 h-6 text-[11px]"
            />
            <span className="text-[11px] text-[var(--color-text-muted)] font-[family-name:var(--font-mono)]">ms</span>
          </div>
        </div>
      </div>
    </PanelCard>
  );
}
