import { useTranslation } from 'react-i18next';
import { useSessionStore } from '../../../store';
import type { Session } from '../../../types';
import type { ProtocolValidationErrors } from '../../../utils/protocolConfig';
import { isValidIPv4, isValidPort } from '../../../utils/validation';
import { CONFIG_FIELD_DEBOUNCE_MS } from '../../../config/constants';
import { FieldLabel, FieldInput, FieldNumberInput } from '../ui';

interface Props {
  session: Session;
  disabled: boolean;
  errors: ProtocolValidationErrors;
  onValidate: (errors: ProtocolValidationErrors) => void;
}

export default function UdpClientForm({ session, disabled, errors, onValidate }: Props) {
  const { t } = useTranslation();
  const updateConfig = useSessionStore(s => s.updateConfig);
  const { config } = session;

  const update = (patch: Partial<typeof config>) => updateConfig(session.id, patch);

  return (
    <>
      <div>
        <FieldLabel seq={2} label={t('network.remoteIp')} />
        <FieldInput
          debounceMs={CONFIG_FIELD_DEBOUNCE_MS}
          value={config.remoteHost}
          onChange={(v) => update({ remoteHost: v })}
          onLiveChange={(v) => onValidate({ remoteHost: !isValidIPv4(v) })}
          placeholder="127.0.0.1"
          disabled={disabled}
          error={errors.remoteHost}
        />
        {errors.remoteHost && <span className="text-2xs text-[var(--color-error)] mt-1 block">{t('validation.invalidIp')}</span>}
      </div>
      <div>
        <FieldLabel seq={3} label={t('network.remotePort')} />
        <FieldNumberInput
          debounceMs={CONFIG_FIELD_DEBOUNCE_MS}
          value={config.remotePort}
          onChange={(n) => update({ remotePort: n })}
          onLiveChange={(n) => onValidate({ remotePort: !isValidPort(n) })}
          min={1}
          max={65535}
          disabled={disabled}
          error={errors.remotePort}
        />
        {errors.remotePort && <span className="text-2xs text-[var(--color-error)] mt-1 block">{t('validation.invalidPort')}</span>}
      </div>
      <div>
        <FieldLabel seq={4} label={t('network.localPort')} />
        <FieldNumberInput
          debounceMs={CONFIG_FIELD_DEBOUNCE_MS}
          value={config.localPort}
          onChange={(n) => update({ localPort: n })}
          onLiveChange={(n) => onValidate({ localPort: !isValidPort(n, true) })}
          min={0}
          max={65535}
          disabled={disabled}
          error={errors.localPort}
        />
        {errors.localPort && <span className="text-2xs text-[var(--color-error)] mt-1 block">{t('validation.invalidPort')}</span>}
      </div>
    </>
  );
}
