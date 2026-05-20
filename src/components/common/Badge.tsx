import type { ReactNode } from 'react';
import { Badge as ChakraBadge } from '@chakra-ui/react';

interface Props {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  children: ReactNode;
  className?: string;
}

const variantProps = {
  default: { bg: 'bg.muted', color: 'fg.muted' },
  primary: { bg: 'accent.subtle', color: 'accent' },
  success: { bg: 'success.subtle', color: 'success' },
  warning: { bg: 'warning.subtle', color: 'warning' },
  error: { bg: 'danger.subtle', color: 'danger' },
};

export default function Badge({ variant = 'default', children, className }: Props) {
  const styles = variantProps[variant];

  return (
    <ChakraBadge
      variant="subtle"
      size="sm"
      rounded="full"
      px="2"
      py="0.5"
      fontSize="2xs"
      fontFamily="mono"
      textTransform="uppercase"
      letterSpacing="wide"
      className={className}
      {...styles}
    >
      {children}
    </ChakraBadge>
  );
}
