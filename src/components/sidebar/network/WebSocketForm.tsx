import { useTranslation } from 'react-i18next';
import { useSessionStore } from '../../../store';
import type { StreamSession } from '../../../types';
import type { ProtocolValidationErrors } from '../../../utils/protocolConfig';
import { isValidWsUrl } from '../../../utils/validation';
import { CONFIG_FIELD_DEBOUNCE_MS } from '../../../config/constants';
import { FieldLabel, FieldInput } from '../ui';

interface Props {
  session: StreamSession;
  disabled: boolean;
  errors: ProtocolValidationErrors;
  onValidate: (errors: ProtocolValidationErrors) => void;
}

export default function WebSocketForm({ session, disabled, errors, onValidate }: Props) {
  const { t } = useTranslation();
  const updateConfig = useSessionStore(s => s.updateConfig);
  const { config } = session;

  return (
    <div>
      <FieldLabel seq={2} label={t('network.wsUrl')} />
      <FieldInput
        debounceMs={CONFIG_FIELD_DEBOUNCE_MS}
        value={config.wsUrl}
        onChange={(v) => updateConfig(session.id, { wsUrl: v })}
        onLiveChange={(v) => onValidate({ wsUrl: !isValidWsUrl(v) })}
        placeholder="ws://127.0.0.1:8080"
        disabled={disabled}
        error={errors.wsUrl}
      />
      {errors.wsUrl && <span className="text-2xs text-[var(--color-error)] mt-1 block">{t('validation.invalidWsUrl')}</span>}
    </div>
  );
}
