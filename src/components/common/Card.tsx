import type { ReactNode } from 'react';
import { Card as ChakraCard } from '@chakra-ui/react';

interface Props {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  elevated?: boolean;
}

const paddingMap = {
  none: '0',
  sm: '3',
  md: '4',
  lg: '6',
};

export default function Card({
  children,
  className,
  padding = 'md',
  elevated = false,
}: Props) {
  return (
    <ChakraCard.Root
      size="sm"
      variant="outline"
      bg="bg.panel"
      borderColor="border"
      borderTopWidth={elevated ? '1px' : undefined}
      borderTopColor={elevated ? 'whiteAlpha.100' : undefined}
      shadow="sm"
      className={className}
    >
      <ChakraCard.Body p={paddingMap[padding]}>{children}</ChakraCard.Body>
    </ChakraCard.Root>
  );
}
