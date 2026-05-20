import type { ReactNode } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from '../theme';

interface Props {
  children: ReactNode;
}

export default function AppProvider({ children }: Props) {
  return <ChakraProvider value={system}>{children}</ChakraProvider>;
}
