import { useTranslation } from 'react-i18next';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Box, Button, Dialog, Flex, Image, Text } from '@chakra-ui/react';
import { APP } from '../config/app';
import AppDialog from './ui/AppDialog';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AboutDialog({ open, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <AppDialog open={open} onClose={onClose} size="xs">
      <Dialog.Header>
        <Dialog.Title srOnly>{APP.name}</Dialog.Title>
      </Dialog.Header>
      <Dialog.Body>
        <Flex align="center" gap="3" mb="4">
          <Box
            w="12"
            h="12"
            rounded="md"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
            bg="accent.subtle"
            borderWidth="1px"
            borderColor="accent.subtle"
          >
            <Image src="/app-icon.png" alt={APP.name} width="30px" height="30px" rounded="md" />
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="normal" color="accent" letterSpacing="tight">
              {APP.name}
            </Text>
            <Text fontSize="xs" color="accent" opacity={0.7} fontFamily="mono">
              v{APP.version}
            </Text>
          </Box>
        </Flex>

        <Text fontSize="sm" color="fg.subtle" mb="5" lineHeight="relaxed">
          {APP.description}
        </Text>

        <Button
          variant="outline"
          width="full"
          mb="5"
          onClick={() => openUrl(APP.github)}
          borderColor="accent.subtle"
          bg="accent.subtle"
          color="accent"
          _hover={{ bg: 'accent.subtle', opacity: 0.9 }}
        >
          GitHub
        </Button>

        <Button
          width="full"
          onClick={onClose}
          bg="accent.subtle"
          color="accent"
          borderWidth="1px"
          borderColor="accent.subtle"
          _hover={{ bg: 'accent.subtle', opacity: 0.85 }}
        >
          {t('about.confirm')}
        </Button>
      </Dialog.Body>
    </AppDialog>
  );
}
