import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Dialog,
  Flex,
  Stack,
  Text,
} from '@chakra-ui/react';
import type { Session } from '../types';
import AppDialog from './ui/AppDialog';

export interface UnsavedSessionEntry {
  session: Session;
  /** Group breadcrumb (root-first). Empty array = session lives at workspace root. */
  path: string[];
}

interface Props {
  open: boolean;
  isExiting?: boolean;
  variant?: 'close' | 'export';
  unsavedSessions: UnsavedSessionEntry[];
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export default function CloseConfirmDialog({
  open,
  isExiting,
  variant = 'close',
  unsavedSessions,
  onSave,
  onDiscard,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const totalCount = unsavedSessions.length;
  const isExport = variant === 'export';

  // Group unsaved sessions by their breadcrumb path so the dialog mirrors
  // the sidebar layout. Root-level sessions go under a single "(root)" bucket.
  const buckets = new Map<string, { label: string; sessions: Session[] }>();
  for (const { session, path } of unsavedSessions) {
    const key = path.length === 0 ? '__root__' : path.join(' / ');
    const label = path.length === 0 ? t('groups.title') : path.join(' / ');
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.sessions.push(session);
    } else {
      buckets.set(key, { label, sessions: [session] });
    }
  }

  return (
    <AppDialog open={open} onClose={onCancel} size="sm">
      <Dialog.Header>
        <Dialog.Title color="fg">
          {isExport ? t('closeConfirm.exportTitle') : t('closeConfirm.title')}
        </Dialog.Title>
      </Dialog.Header>
      <Dialog.Body>
        <Text fontSize="sm" color="fg.subtle" mb="4">
          {isExport
            ? t('closeConfirm.exportMessage', { count: totalCount })
            : t('closeConfirm.message', { count: totalCount })}
        </Text>

        <Box
          maxH="180px"
          overflowY="auto"
          mb="5"
          rounded="md"
          bg="bg.subtle"
          borderWidth="1px"
          borderColor="border"
          p="2"
        >
          <Stack gap="2">
            {[...buckets.entries()].map(([key, { label, sessions }]) => (
              <Box key={key}>
                <Text
                  px="2"
                  pt="1"
                  pb="0.5"
                  fontSize="2xs"
                  fontFamily="mono"
                  textTransform="uppercase"
                  letterSpacing="wider"
                  color="fg.subtle"
                >
                  {label}
                </Text>
                <Stack gap="0">
                  {sessions.map((sess) => (
                    <Flex
                      key={sess.id}
                      align="center"
                      gap="2"
                      px="3"
                      py="1"
                      fontSize="xs"
                      color="fg.muted"
                      fontFamily="mono"
                    >
                      <Box w="1.5" h="1.5" rounded="full" bg="warning" flexShrink={0} />
                      <Text truncate flex="1">
                        {sess.name}
                      </Text>
                      <Text color="fg.subtle" opacity={0.5} flexShrink={0}>
                        {sess.protocol.replace('_', ' ')}
                      </Text>
                    </Flex>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>

        <Flex gap="2" align="stretch">
          <Button
            flex="1"
            minW="0"
            h="auto"
            minH="9"
            py="2"
            px="2"
            whiteSpace="normal"
            lineHeight="short"
            disabled={isExiting}
            onClick={onSave}
            loading={isExiting}
            bg="accent.subtle"
            color="accent"
            borderWidth="1px"
            borderColor="accent.subtle"
            _hover={{ bg: 'accent.subtle', opacity: 0.9 }}
          >
            {t('closeConfirm.save')}
          </Button>
          <Button
            flex="1"
            minW="0"
            h="auto"
            minH="9"
            py="2"
            px="2"
            whiteSpace="normal"
            lineHeight="short"
            disabled={isExiting}
            onClick={onDiscard}
            variant="outline"
            color="danger"
            borderColor="danger.subtle"
            bg="danger.subtle"
            _hover={{ bg: 'danger.subtle', opacity: 0.9 }}
          >
            {isExport ? t('closeConfirm.exportDontSave') : t('closeConfirm.dontSave')}
          </Button>
          <Button
            flex="1"
            minW="0"
            h="auto"
            minH="9"
            py="2"
            px="2"
            whiteSpace="normal"
            lineHeight="short"
            disabled={isExiting}
            onClick={onCancel}
            variant="outline"
            bg="bg.muted"
            borderColor="border"
            color="fg.muted"
          >
            {t('closeConfirm.cancel')}
          </Button>
        </Flex>
      </Dialog.Body>
    </AppDialog>
  );
}
