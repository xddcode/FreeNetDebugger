import { Box, Button, Flex } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '../../../store';
import type { StreamSession } from '../../../types';
import type { ProtocolValidationErrors } from '../../../utils/protocolConfig';
import { useSerialPorts } from '../../../hooks/useSerialPorts';
import { showToast } from '../../../store/toastStore';
import { FieldLabel, FieldSelect } from '../ui';

interface Props {
  session: StreamSession;
  disabled: boolean;
  errors: ProtocolValidationErrors;
  onValidate: (errors: ProtocolValidationErrors) => void;
}

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];
const DATA_BITS: { value: string; label: string }[] = [
  { value: '5', label: '5' }, { value: '6', label: '6' },
  { value: '7', label: '7' }, { value: '8', label: '8' },
];
const STOP_BITS: { value: string; label: string }[] = [
  { value: '1', label: '1' }, { value: '2', label: '2' },
];

export default function SerialForm({ session, disabled, errors, onValidate }: Props) {
  const { t } = useTranslation();
  const updateConfig = useSessionStore(s => s.updateConfig);
  const { config } = session;
  const { ports, loading: portsLoading, refresh: refreshPorts } = useSerialPorts();

  const portOptions = ports.map(p => ({ value: p, label: p }));

  return (
    <>
      <Flex align="flex-end" gap="2">
        <Box flex="1">
          <FieldLabel seq={2} label={t('serial.port')} />
          <FieldSelect
            value={config.serialPort}
            onChange={v => { updateConfig(session.id, { serialPort: v }); onValidate({ serialPort: !v }); }}
            options={portOptions.length > 0 ? portOptions : [{ value: '', label: t('serial.noPorts') }]}
            disabled={disabled || portsLoading}
          />
        </Box>
        <Button
          onClick={async () => {
            try {
              await refreshPorts();
              showToast('success', t('toast.portsRefreshed'));
            } catch {
              showToast('error', t('toast.portsRefreshFailed'));
            }
          }}
          disabled={portsLoading}
          size="sm"
          variant="outline"
          colorPalette="blue"
          fontFamily="mono"
          fontSize="2xs"
        >
          {portsLoading ? '...' : t('serial.refresh')}
        </Button>
      </Flex>
      {errors.serialPort && <span className="text-2xs text-[var(--color-error)] mt-1 block">{t('serial.selectPort')}</span>}
      <div>
        <FieldLabel seq={3} label={t('serial.baudRate')} />
        <FieldSelect
          value={String(config.baudRate)}
          onChange={v => updateConfig(session.id, { baudRate: Number(v) })}
          options={BAUD_RATES.map(b => ({ value: String(b), label: String(b) }))}
          disabled={disabled}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <FieldLabel label={t('serial.dataBits')} />
          <FieldSelect
            value={String(config.dataBits)}
            onChange={v => updateConfig(session.id, { dataBits: Number(v) as 5 | 6 | 7 | 8 })}
            options={DATA_BITS}
            disabled={disabled}
          />
        </div>
        <div>
          <FieldLabel label={t('serial.stopBits')} />
          <FieldSelect
            value={String(config.stopBits)}
            onChange={v => updateConfig(session.id, { stopBits: Number(v) as 1 | 2 })}
            options={STOP_BITS}
            disabled={disabled}
          />
        </div>
        <div>
          <FieldLabel label={t('serial.parity')} />
          <FieldSelect
            value={config.parity}
            onChange={v => updateConfig(session.id, { parity: v as 'none' | 'odd' | 'even' })}
            options={[
              { value: 'none', label: t('serial.parityNone') },
              { value: 'odd', label: t('serial.parityOdd') },
              { value: 'even', label: t('serial.parityEven') },
            ]}
            disabled={disabled}
          />
        </div>
      </div>
    </>
  );
}
