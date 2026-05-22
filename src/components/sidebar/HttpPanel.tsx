import { useTranslation } from 'react-i18next';
import { Button, Stack } from '@chakra-ui/react';
import { useSessionStore } from '../../store';
import type { HttpSession } from '../../types';
import HttpKeyValueRow from '../ui/HttpKeyValueRow';
import { PanelCard, PanelHeader } from './ui';

interface Props {
  session: HttpSession;
}

export default function HttpPanel({ session }: Props) {
  const { t } = useTranslation();
  const updateConfig = useSessionStore(s => s.updateConfig);
  const isActive = session.status === 'connected';
  const isBusy = session.status === 'connecting' || session.status === 'disconnecting';

  const httpHeaders = session.config.httpHeaders ?? [];

  const addHeader = () => {
    updateConfig(session.id, {
      httpHeaders: [...httpHeaders, { key: '', value: '', enabled: true }],
    });
  };

  const updateHeader = (index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    const next = httpHeaders.map((h, i) =>
      i === index ? { ...h, [field]: value } : h,
    );
    updateConfig(session.id, { httpHeaders: next });
  };

  const removeHeader = (index: number) => {
    const next = httpHeaders.filter((_, i) => i !== index);
    updateConfig(session.id, { httpHeaders: next });
  };

  const disabled = isActive || isBusy;

  return (
    <PanelCard>
      <PanelHeader
        icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        label={t('http.headers')}
      />
      <Stack p="3" gap="1.5">
        {httpHeaders.map((h, i) => (
          <HttpKeyValueRow
            key={i}
            enabled={h.enabled}
            keyValue={h.key}
            value={h.value}
            onEnabledChange={(v) => updateHeader(i, 'enabled', v)}
            onKeyChange={(v) => updateHeader(i, 'key', v)}
            onValueChange={(v) => updateHeader(i, 'value', v)}
            onRemove={() => removeHeader(i)}
            keyPlaceholder="Header"
            valuePlaceholder="Value"
            disabled={disabled}
          />
        ))}
        <Button
          onClick={addHeader}
          disabled={disabled}
          size="xs"
          variant="ghost"
          colorPalette="blue"
          justifyContent="flex-start"
          fontFamily="mono"
          fontSize="2xs"
        >
          + {t('shortcuts.add')}
        </Button>
      </Stack>
    </PanelCard>
  );
}
