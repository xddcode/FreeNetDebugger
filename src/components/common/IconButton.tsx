import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { IconButton as ChakraIconButton } from '@chakra-ui/react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  variant?: 'default' | 'primary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  className?: string;
}

const sizeMap = {
  sm: 'xs' as const,
  md: 'sm' as const,
  lg: 'md' as const,
};

export default function IconButton({
  icon,
  variant = 'default',
  size = 'md',
  title,
  className,
  disabled = false,
  ...rest
}: Props) {
  const chakraVariant =
    variant === 'ghost' ? 'ghost' : variant === 'primary' ? 'subtle' : 'outline';

  return (
    <ChakraIconButton
      aria-label={title ?? 'button'}
      title={title}
      variant={chakraVariant}
      size={sizeMap[size]}
      disabled={disabled}
      className={className}
      colorPalette={variant === 'primary' ? 'blue' : 'gray'}
      bg={variant === 'primary' ? 'accent.subtle' : variant === 'default' ? 'bg.muted' : undefined}
      color={variant === 'primary' ? 'accent' : 'fg.muted'}
      borderColor={variant === 'default' ? 'border' : undefined}
      _hover={{ color: 'fg' }}
      {...rest}
    >
      {icon}
    </ChakraIconButton>
  );
}
