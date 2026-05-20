import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button as ChakraButton } from '@chakra-ui/react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  className?: string;
}

const variantMap = {
  primary: { variant: 'solid' as const, colorPalette: 'blue' },
  secondary: { variant: 'outline' as const, colorPalette: 'gray' },
  ghost: { variant: 'ghost' as const, colorPalette: 'gray' },
  danger: { variant: 'outline' as const, colorPalette: 'red' },
};

const sizeMap = {
  sm: 'xs' as const,
  md: 'sm' as const,
  lg: 'md' as const,
};

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  className,
  disabled = false,
  ...rest
}: Props) {
  const mapped = variantMap[variant];

  return (
    <ChakraButton
      variant={mapped.variant}
      colorPalette={mapped.colorPalette}
      size={sizeMap[size]}
      disabled={disabled}
      className={className}
      bg={variant === 'primary' ? 'accent' : undefined}
      color={variant === 'primary' ? 'accent.fg' : undefined}
      _hover={
        variant === 'primary'
          ? { bg: 'accent.emphasized' }
          : undefined
      }
      borderColor={variant === 'secondary' ? 'border' : undefined}
      {...rest}
    >
      {children}
    </ChakraButton>
  );
}
