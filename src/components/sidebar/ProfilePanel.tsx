import { useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { Box, Button, Flex, Stack, Text } from '@chakra-ui/react';
import { useSessionStore } from '../../store';
import type { Session, ConnectionConfig } from '../../types';
import { extractProtocolConfig } from '../../utils/protocolConfig';
import { showToast } from '../../store/toastStore';
import { PanelCard, PanelHeader } from './ui';

interface Props {
  session: Session;
}

interface ExportedSessionConfig {
  _fndVersion: string;
  _type: 'fnd-session-config';
  exportedAt: number;
  name: string;
  protocol: string;
  config: Partial<ConnectionConfig>;
  receiveSettings: object;
  sendSettings: object;
}

function isValidConfig(data: unknown): data is ExportedSessionConfig {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    d._type === 'fnd-session-config' &&
    typeof d.config === 'object' &&
    d.config !== null &&
    typeof (d.config as Record<string, unknown>).protocol === 'string'
  );
}

export default function ProfilePanel({ session }: Props) {
  const { t } = useTranslation();
  const updateConfig = useSessionStore((s) => s.updateConfig);
  const updateReceiveSettings = useSessionStore((s) => s.updateReceiveSettings);
  const updateSendSettings = useSessionStore((s) => s.updateSendSettings);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const handleExport = async () => {
    const payload: ExportedSessionConfig = {
      _fndVersion: '1.0',
      _type: 'fnd-session-config',
      exportedAt: Date.now(),
      name: session.name,
      protocol: session.config.protocol,
      config: extractProtocolConfig(session.config),
      receiveSettings: { ...session.receiveSettings },
      sendSettings: { ...session.sendSettings },
    };
    const defaultName = `fnd-${session.config.protocol.toLowerCase().replace('_', '-')}-${Date.now()}.json`;

    const path = await save({
      defaultPath: defaultName,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (!path) return;

    try {
      await writeTextFile(path, JSON.stringify(payload, null, 2));
      showToast('success', t('toast.exportSuccess'));
    } catch {
      showToast('error', t('toast.exportFailed'));
    }
  };

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result;
        if (typeof content !== 'string') {
          setImportMsg({ text: t('profile.importInvalid'), ok: false });
          showToast('error', t('toast.importFailed'));
          return;
        }
        const data = JSON.parse(content) as unknown;
        if (!isValidConfig(data)) {
          setImportMsg({ text: t('profile.importInvalid'), ok: false });
          showToast('error', t('toast.importFailed'));
          return;
        }
        updateConfig(session.id, data.config);
        updateReceiveSettings(session.id, data.receiveSettings);
        updateSendSettings(session.id, data.sendSettings);
        setImportMsg({ text: t('profile.importSuccess'), ok: true });
        showToast('success', t('toast.importSuccess'));
      } catch {
        setImportMsg({ text: t('profile.importInvalid'), ok: false });
        showToast('error', t('toast.importFailed'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <PanelCard>
      <PanelHeader
        icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M12 18v-6" />
            <path d="M9 15l3-3 3 3" />
          </svg>
        }
        label={t('profile.title')}
      />
      <Stack gap="4" px="4" py="3" pt="2">
        <Flex align="center" gap="2" fontSize="sm" fontFamily="mono" fontWeight="normal">
          <Text color="accent">{session.config.protocol}</Text>
          <Text color="fg.subtle" truncate>
            {session.name}
          </Text>
        </Flex>

        <Flex gap="2">
          <Button
            flex="1"
            size="sm"
            variant="outline"
            onClick={() => void handleExport()}
            bg="accent.subtle"
            color="accent"
            borderColor="accent.subtle"
            fontFamily="mono"
            fontSize="sm"
            fontWeight="normal"
          >
            {t('profile.export')}
          </Button>
          <Button
            flex="1"
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            bg="bg.muted"
            color="fg.muted"
            borderColor="border"
            fontFamily="mono"
            fontSize="sm"
            fontWeight="normal"
          >
            {t('profile.import')}
          </Button>
          <input ref={fileInputRef} type="file" accept=".json" hidden onChange={handleImport} />
        </Flex>

        {importMsg && (
          <Box
            fontSize="2xs"
            fontFamily="mono"
            px="2"
            py="1"
            rounded="md"
            bg={importMsg.ok ? 'success.subtle' : 'danger.subtle'}
            color={importMsg.ok ? 'success' : 'danger'}
          >
            {importMsg.text}
          </Box>
        )}

        <Text fontSize="2xs" fontFamily="body" fontWeight="normal" color="fg.subtle" lineHeight="body">
          {t('profile.hint')}
        </Text>
      </Stack>
    </PanelCard>
  );
}
