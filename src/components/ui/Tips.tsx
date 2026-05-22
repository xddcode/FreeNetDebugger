import type { ReactNode } from 'react';
import { IconButton, Text, Tooltip } from '@chakra-ui/react';
import { CircleHelp } from 'lucide-react';

interface TipsProps {
  children: ReactNode;
  label?: string;
}

export default function Tips({ children, label = 'Help' }: TipsProps) {
  return (
    <Tooltip.Root openDelay={200} closeDelay={80} positioning={{ placement: 'right' }}>
      <Tooltip.Trigger asChild>
        <IconButton
          aria-label={label}
          variant="ghost"
          size="sm"
          color="fg.subtle"
          minW="8"
          width="8"
          height="8"
          p="0"
          _hover={{ color: 'fg.muted', bg: 'bg.muted' }}
        >
          <CircleHelp size={24} strokeWidth={2} />
        </IconButton>
      </Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content
          maxW="300px"
          px="3"
          py="2"
          bg="bg.panel"
          color="fg.muted"
          borderWidth="1px"
          borderColor="border"
          rounded="md"
          shadow="md"
          fontSize="2xs"
          lineHeight="body"
        >
          {children}
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  );
}

interface TipsTextProps {
  children: ReactNode;
  mono?: boolean;
}

export function TipsText({ children, mono = false }: TipsTextProps) {
  return (
    <Text
      fontSize="2xs"
      fontFamily={mono ? 'mono' : 'body'}
      fontWeight="normal"
      color="fg.muted"
      lineHeight="body"
    >
      {children}
    </Text>
  );
}
