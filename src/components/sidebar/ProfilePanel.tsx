import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Flex, Stack, Text } from '@chakra-ui/react';
import type { Session } from '../../types';
import { exportSessionProfile, importSessionProfileFromFile } from '../../services/sessionProfileService';
import { showToast } from '../../store/toastStore';
import { useUnsavedGuard } from '../../context/UnsavedGuardContext';
import { PanelCard, PanelHeader } from './ui';

interface Props {
  session: Session;
}

export default function ProfilePanel({ session }: Props) {
  const { t } = useTranslation();
  const { requestGuardedAction } = useUnsavedGuard();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const runExport = async () => {
    const result = await exportSessionProfile(session.id);
    if (result.cancelled) {
      return;
    }
    if (result.ok) {
      showToast('success', t('toast.exportSuccess'));
    } else {
      showToast('error', t('toast.exportFailed'));
    }
  };

  const handleExport = () => {
    requestGuardedAction({ kind: 'export', sessionId: session.id }, runExport);
  };

  const handleImport = async (file: File) => {
    const result = await importSessionProfileFromFile(session.id, file);
    if (result.ok) {
      setImportMsg({ text: t('profile.importSuccess'), ok: true });
      showToast('success', t('toast.importSuccess'));
      return;
    }
    const failText = result.reason === 'protocolMismatch'
      ? t('toast.importProtocolMismatch')
      : t('profile.importInvalid');
    setImportMsg({ text: failText, ok: false });
    showToast('error', failText);
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
          <Text color="accent">{session.protocol}</Text>
          <Text color="fg.subtle" truncate>
            {session.name}
          </Text>
        </Flex>

        <Flex gap="2">
          <Button
            flex="1"
            size="sm"
            variant="outline"
            onClick={handleExport}
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
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void handleImport(file);
              }
              e.target.value = '';
            }}
          />
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
