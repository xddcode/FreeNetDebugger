import { Box, Button, Flex } from '@chakra-ui/react';

interface Props {
  isActive: boolean;
  isBusy: boolean;
  connectLabel: string;
  disconnectLabel: string;
  connectingLabel: string;
  disabled?: boolean;
  onClick: () => void;
}

export default function ConnectActionButton({
  isActive,
  isBusy,
  connectLabel,
  disconnectLabel,
  connectingLabel,
  disabled,
  onClick,
}: Props) {
  const dotColor = isActive ? 'danger' : 'fg.subtle';

  return (
    <Button
      width="full"
      onClick={onClick}
      disabled={disabled || isBusy}
      loading={isBusy}
      loadingText={connectingLabel}
      variant="outline"
      size="md"
      fontSize="sm"
      fontFamily="mono"
      bg={isActive ? 'danger.subtle' : 'accent.subtle'}
      color={isActive ? 'danger' : 'accent'}
      borderColor={isActive ? 'danger.subtle' : 'accent.subtle'}
      _hover={{
        bg: isActive ? 'danger.subtle' : 'accent.subtle',
        opacity: 0.9,
      }}
    >
      <Flex align="center" gap="2">
        <Box w="1.5" h="1.5" rounded="full" bg={dotColor} boxShadow="0 0 5px currentColor" />
        {isActive ? disconnectLabel : connectLabel}
      </Flex>
    </Button>
  );
}
