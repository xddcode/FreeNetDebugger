import { useTranslation } from 'react-i18next';
import { useSessionStore } from '../../../store';
import type { Session } from '../../../types';
import type { ProtocolValidationErrors } from '../../../utils/protocolConfig';
import { CONFIG_FIELD_DEBOUNCE_MS } from '../../../config/constants';
import { FieldLabel, FieldInput, FieldSelect } from '../ui';

interface Props {
  session: Session;
  disabled: boolean;
  errors: ProtocolValidationErrors;
  onValidate: (errors: ProtocolValidationErrors) => void;
}

import { HTTP_METHODS } from '../../../utils/http';
import type { HttpMethod } from '../../../types';

export default function HttpForm({ session, disabled, errors, onValidate }: Props) {
  const { t } = useTranslation();
  const updateConfig = useSessionStore(s => s.updateConfig);
  const { config } = session;

  return (
    <>
      <div className="flex items-end gap-2">
        <div className="w-[110px]">
          <FieldLabel seq={2} label={t('http.method')} />
          <FieldSelect
            value={config.httpMethod}
            onChange={v => updateConfig(session.id, { httpMethod: v as HttpMethod })}
            options={HTTP_METHODS.map(m => ({ value: m, label: m }))}
            disabled={disabled}
          />
        </div>
        <div className="flex-1">
          <FieldLabel seq={3} label={t('http.url')} />
          <FieldInput
            debounceMs={CONFIG_FIELD_DEBOUNCE_MS}
            value={config.httpUrl}
            onChange={(v) => updateConfig(session.id, { httpUrl: v })}
            onLiveChange={(v) => onValidate({ httpUrl: !v || !v.startsWith('http') })}
            placeholder="https://api.example.com"
            disabled={disabled}
            error={errors.httpUrl}
          />
        </div>
      </div>
      {errors.httpUrl && <span className="text-2xs text-[var(--color-error)] mt-1 block">{t('http.invalidUrl')}</span>}
    </>
  );
}
