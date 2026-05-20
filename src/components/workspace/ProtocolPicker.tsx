import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  Icon,
  Input,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useSessionStore } from '../../store';
import { showToast } from '../../store/toastStore';
import type { ProtocolType } from '../../types';
import { PROTOCOL_CARDS } from './protocolCards';

interface Props {
  selectTitle: string;
  selectDescription?: string;
  iconSize?: 'md' | 'lg';
  maxGridWidth?: string;
  showCancel?: boolean;
  /** Drop the new session into this group. `null` (default) = root of the workspace. */
  parentGroupId?: string | null;
  onCancel?: () => void;
  onCreated?: () => void;
}

export default function ProtocolPicker({
  selectTitle,
  selectDescription,
  iconSize = 'md',
  maxGridWidth = '480px',
  showCancel = false,
  parentGroupId = null,
  onCancel,
  onCreated,
}: Props) {
  const { t } = useTranslation();
  const addSession = useSessionStore((s) => s.addSession);
  const [step, setStep] = useState<'select' | 'name'>('select');
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolType | null>(null);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const heroSize = iconSize === 'lg' ? '16' : '14';
  const heroIconBox = iconSize === 'lg' ? 7 : 6;

  useEffect(() => {
    if (step === 'name' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [step]);

  const handleSelectProtocol = (protocol: ProtocolType) => {
    setSelectedProtocol(protocol);
    const card = PROTOCOL_CARDS.find((c) => c.key === protocol);
    setName(card?.label || '');
    setStep('name');
  };

  const handleConfirm = () => {
    if (!selectedProtocol) {
      return;
    }
    addSession(selectedProtocol, name.trim() || undefined, parentGroupId);
    showToast('success', t('toast.sessionCreated'));
    onCreated?.();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
    if (e.key === 'Escape') {
      if (step === 'name') {
        setStep('select');
        setSelectedProtocol(null);
      } else {
        onCancel?.();
      }
    }
  };

  if (step === 'select') {
    return (
      <Stack gap="6" align="center" width="full" onKeyDown={handleKeyDown}>
        <Stack gap="3" align="center" textAlign="center">
          <Flex
            w={heroSize}
            h={heroSize}
            rounded="xl"
            align="center"
            justify="center"
            bg="accent.subtle"
            borderWidth="1px"
            borderColor="accent.subtle"
            color="accent"
          >
            <Icon boxSize={heroIconBox}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </Icon>
          </Flex>
          <Heading size={iconSize === 'lg' ? 'md' : 'sm'} color="fg">
            {selectTitle}
          </Heading>
          {selectDescription && (
            <Text fontSize="sm" color="fg.subtle">
              {selectDescription}
            </Text>
          )}
        </Stack>

        <Grid
          templateColumns={{ base: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }}
          gap="3"
          width="full"
          maxW={maxGridWidth}
        >
          {PROTOCOL_CARDS.map((card) => (
            <Button
              key={card.key}
              variant="outline"
              height="auto"
              minH="14"
              py="3"
              px="3"
              justifyContent="flex-start"
              alignItems="flex-start"
              gap="3"
              whiteSpace="normal"
              bg="bg.subtle"
              borderColor="border"
              color="fg"
              _hover={{
                bg: 'accent.subtle',
                borderColor: 'accent',
                color: 'accent',
              }}
              onClick={() => handleSelectProtocol(card.key)}
            >
              <Flex flexShrink={0} pt="0.5" color="fg.subtle">
                {card.icon}
              </Flex>
              <Box flex="1" minW="0" textAlign="left">
                <Text fontSize="sm" fontWeight="medium" lineHeight="short">
                  {card.label}
                </Text>
                <Text
                  fontSize="2xs"
                  color="fg.subtle"
                  lineHeight="1.4"
                  mt="0.5"
                  wordBreak="break-word"
                >
                  {card.desc}
                </Text>
              </Box>
            </Button>
          ))}
        </Grid>

        {showCancel && (
          <Button variant="ghost" size="xs" color="fg.subtle" onClick={onCancel}>
            {t('workspace.cancel')}
          </Button>
        )}
      </Stack>
    );
  }

  if (!selectedProtocol) {
    return null;
  }

  return (
    <Stack gap="6" align="center" width="full" maxW={maxGridWidth} onKeyDown={handleKeyDown}>
      <Stack gap="3" align="center" textAlign="center" width="full">
        <Flex
          w={heroSize}
          h={heroSize}
          rounded="xl"
          align="center"
          justify="center"
          bg="accent.subtle"
          borderColor="accent.subtle"
          borderWidth="1px"
          color="accent"
        >
          {PROTOCOL_CARDS.find((c) => c.key === selectedProtocol)?.icon}
        </Flex>
        <Heading size={iconSize === 'lg' ? 'md' : 'sm'} color="fg">
          {t('workspace.nameSession')}
        </Heading>
        <Text fontSize="sm" color="fg.subtle">
          {t('workspace.nameSessionDesc')}
        </Text>
      </Stack>

      <Input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('workspace.sessionNamePlaceholder')}
        size="md"
        width="full"
        fontFamily="mono"
      />

      <Flex gap="3" width="full">
        <Button
          flex="1"
          variant="outline"
          borderColor="border"
          color="fg.subtle"
          onClick={() => {
            setStep('select');
            setSelectedProtocol(null);
          }}
        >
          {t('workspace.back')}
        </Button>
        <Button
          flex="1"
          bg="accent"
          color="accent.fg"
          _hover={{ bg: 'accent.emphasized' }}
          onClick={handleConfirm}
        >
          {t('workspace.create')}
        </Button>
      </Flex>
    </Stack>
  );
}
