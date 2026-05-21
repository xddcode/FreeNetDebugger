import { Box, Center, Spinner, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';

export interface LoadingOverlayProps {
  loading: boolean;
  label?: string;
  children?: ReactNode;
  /** Lightly dim content under the overlay (Bruno-style stale preview) */
  dimContent?: boolean;
}

/**
 * Chakra overlay pattern: relative container + absolute inset scrim + centered Spinner.
 * @see https://www.chakra-ui.com/docs/components/spinner
 */
export default function LoadingOverlay({
  loading,
  label,
  children,
  dimContent = true,
}: LoadingOverlayProps) {
  const hasContent = children !== null && children !== undefined;

  return (
    <Box
      position="relative"
      flex="1"
      minH="0"
      display="flex"
      flexDirection="column"
      overflow="hidden"
      aria-busy={loading || undefined}
      userSelect={loading ? 'none' : undefined}
    >
      {hasContent ? (
        <Box
          flex="1"
          minH="0"
          overflow="hidden"
          display="flex"
          flexDirection="column"
          className={loading && dimContent ? 'http-response-stale-dim' : undefined}
          pointerEvents={loading ? 'none' : 'auto'}
        >
          {children}
        </Box>
      ) : null}
      {loading && (
        <Box position="absolute" inset="0" bg="bg/40" zIndex="1">
          <Center h="full" flexDirection="column" gap="3">
            <Spinner size="lg" color="accent" />
            {label ? (
              <Text
                fontSize="sm"
                color="fg"
                fontFamily="mono"
                lineHeight="label"
                letterSpacing="label"
              >
                {label}
              </Text>
            ) : null}
          </Center>
        </Box>
      )}
    </Box>
  );
}
