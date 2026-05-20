import { useEffect, useState } from 'react';
import { Box, CloseButton, Flex, Progress, Text } from '@chakra-ui/react';
import type { Toast } from '../../store/toastStore';
import { useToastStore } from '../../store/toastStore';

interface Props {
  toast: Toast;
}

const typeStyles: Record<
  Toast['type'],
  { bg: string; border: string; color: string }
> = {
  success: { bg: 'success.subtle', border: 'success.subtle', color: 'success' },
  error: { bg: 'danger.subtle', border: 'danger.subtle', color: 'danger' },
  info: { bg: 'accent.subtle', border: 'accent.subtle', color: 'accent' },
  warning: { bg: 'warning.subtle', border: 'warning.subtle', color: 'warning' },
};

const typeIcons: Record<Toast['type'], string> = {
  success: 'M20 6L9 17l-5-5',
  error: 'M18 6L6 18M6 6l12 12',
  info: 'M12 16v-4M12 8h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z',
  warning: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
};

export default function ToastItem({ toast }: Props) {
  const removeToast = useToastStore((s) => s.removeToast);
  const [progress, setProgress] = useState(100);
  const [exiting, setExiting] = useState(false);

  const styles = typeStyles[toast.type];

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / toast.duration) * 100);
      setProgress(pct);
      if (pct <= 0) {
        clearInterval(interval);
        setExiting(true);
        window.setTimeout(() => removeToast(toast.id), 300);
      }
    }, 16);
    return () => clearInterval(interval);
  }, [toast.id, toast.duration, removeToast]);

  const handleDismiss = () => {
    setExiting(true);
    window.setTimeout(() => removeToast(toast.id), 300);
  };

  return (
    <Box
      position="relative"
      minW="260px"
      maxW="360px"
      px="3.5"
      py="2.5"
      rounded="lg"
      borderWidth="1px"
      borderColor={styles.border}
      bg={styles.bg}
      backdropFilter="blur(8px)"
      shadow="lg"
      opacity={exiting ? 0 : 1}
      transform={exiting ? 'translateX(16px)' : 'translateX(0)'}
      transition="all 0.3s ease"
    >
      <Flex align="flex-start" gap="2.5">
        <Box as="span" color={styles.color} flexShrink={0} mt="0.5">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={typeIcons[toast.type]} />
          </svg>
        </Box>
        <Text fontSize="xs" color="fg" lineHeight="relaxed" flex="1">
          {toast.message}
        </Text>
        <CloseButton size="xs" color="fg.subtle" onClick={handleDismiss} mt="-0.5" />
      </Flex>
      <Progress.Root
        value={progress}
        size="xs"
        position="absolute"
        bottom="0"
        left="0"
        right="0"
        roundedBottom="lg"
      >
        <Progress.Track bg="border" opacity={0.3}>
          <Progress.Range bg={styles.color} opacity={0.4} />
        </Progress.Track>
      </Progress.Root>
    </Box>
  );
}
