import type { ReactNode } from 'react';
import { Flex, Text } from '@chakra-ui/react';

export default function HttpEmptyPlaceholder({ children }: { children: ReactNode }) {
  return (
    <Flex flex="1" align="center" justify="center" minH="160px" p="6" bg="bg.panel">
      <Text
        fontSize="2xs"
        color="fg.subtle"
        fontFamily="mono"
        lineHeight="label"
        letterSpacing="label"
        textAlign="center"
        maxW="240px"
      >
        {children}
      </Text>
    </Flex>
  );
}
