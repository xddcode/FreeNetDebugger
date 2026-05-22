import { useTranslation } from 'react-i18next';
import { useSessionStore } from '../../../store';
import type { StreamSession } from '../../../types';
import type { ProtocolValidationErrors } from '../../../utils/protocolConfig';
import { isValidIPv4, isValidPort } from '../../../utils/validation';
import { CONFIG_FIELD_DEBOUNCE_MS } from '../../../config/constants';
import { FieldLabel, FieldInput, FieldNumberInput } from '../ui';

interface Props {
  session: StreamSession;
  disabled: boolean;
  errors: ProtocolValidationErrors;
  onValidate: (errors: ProtocolValidationErrors) => void;
}

export default function UdpServerForm({ session, disabled, errors, onValidate }: Props) {
  const { t } = useTranslation();
  const updateConfig = useSessionStore(s => s.updateConfig);
  const { config } = session;

  const update = (patch: Partial<typeof config>) => updateConfig(session.id, patch);

  return (
    <>
      <div>
        <FieldLabel seq={2} label={t('network.listenAddress')} />
        <FieldInput
          debounceMs={CONFIG_FIELD_DEBOUNCE_MS}
          value={config.localHost}
          onChange={(v) => update({ localHost: v })}
          onLiveChange={(v) => onValidate({ localHost: !isValidIPv4(v) })}
          placeholder="0.0.0.0"
          disabled={disabled}
          error={errors.localHost}
        />
        {errors.localHost && <span className="text-2xs text-[var(--color-error)] mt-1 block">{t('validation.invalidIp')}</span>}
      </div>
      <div>
        <FieldLabel seq={3} label={t('network.listenPort')} />
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
