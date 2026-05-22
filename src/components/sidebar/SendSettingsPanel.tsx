import { useTranslation } from 'react-i18next';
import { Checkbox, Flex, Stack, Text } from '@chakra-ui/react';
import { useSessionStore } from '../../store';
import type { StreamSession } from '../../types';
import {
  PanelCard,
  PanelHeader,
  FieldSelect,
  CheckRow,
  RadioGroupRow,
  CheckboxControl,
  FieldNumberInput,
} from './ui';

interface Props {
  session: StreamSession;
}

export default function SendSettingsPanel({ session }: Props) {
  const { t } = useTranslation();
  const updateSend = useSessionStore((s) => s.updateSendSettings);
  const { sendSettings } = session;

  return (
    <PanelCard>
      <PanelHeader
        icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        }
        label={t('sendSettings.title')}
      />
      <Stack gap="4" px="4" py="3" pt="2">
        <RadioGroupRow
          options={[
            { value: 'ASCII', label: 'ASCII' },
            { value: 'HEX', label: 'HEX' },
            { value: 'UTF8', label: 'UTF-8' },
          ]}
          value={sendSettings.encoding}
          onChange={(v) => updateSend(session.id, { encoding: v as typeof sendSettings.encoding })}
          accent
        />
        <Stack gap="2.5" width="full">
          <CheckRow
            checked={sendSettings.autoParseEscapes}
            onChange={(v) => updateSend(session.id, { autoParseEscapes: v })}
            label={t('sendSettings.autoEscapes')}
            accent
          />
          <CheckRow
            checked={sendSettings.autoCRLF}
            onChange={(v) => updateSend(session.id, { autoCRLF: v })}
            label={t('sendSettings.autoCRLF')}
            accent
          />
          <CheckRow
            checked={sendSettings.autoChecksum}
            onChange={(v) => updateSend(session.id, { autoChecksum: v })}
            label={t('sendSettings.autoChecksum')}
            accent
          />
          {sendSettings.autoChecksum && (
            <FieldSelect
              value={sendSettings.checksumType}
              onChange={(v) =>
                updateSend(session.id, {
                  checksumType: v as 'CRC8' | 'CRC16' | 'CRC32' | 'LRC' | 'XOR' | 'SUM8',
                })
              }
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
          <Flex align="center" justify="space-between" gap="2" mt="1" width="full">
            <Checkbox.Root
              checked={sendSettings.periodicEnabled}
              onCheckedChange={(details) =>
                updateSend(session.id, { periodicEnabled: details.checked === true })
              }
              colorPalette="blue"
              variant="outline"
              size="sm"
              flexShrink={0}
            >
              <Checkbox.HiddenInput />
              <CheckboxControl />
              <Checkbox.Label
                fontSize="2xs"
                fontFamily="mono"
                fontWeight="normal"
                letterSpacing="label"
                color="fg.subtle"
              >
                {t('sendSettings.periodic')}
              </Checkbox.Label>
            </Checkbox.Root>
            <Flex align="center" gap="2" flexShrink={0}>
              <FieldNumberInput
                value={sendSettings.periodicInterval}
                onChange={(v) => updateSend(session.id, { periodicInterval: v || 1000 })}
                min={1}
                step={100}
                disabled={!sendSettings.periodicEnabled}
                width="32"
                size="xs"
                textAlign="right"
              />
              <Text fontSize="2xs" color="fg.subtle" fontFamily="mono">
                ms
              </Text>
            </Flex>
          </Flex>
        </Stack>
      </Stack>
    </PanelCard>
  );
}
