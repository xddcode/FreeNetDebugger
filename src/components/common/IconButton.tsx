import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  variant?: 'default' | 'primary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  className?: string;
}

export default function IconButton({
  icon,
  variant = 'default',
  size = 'md',
  title,
  className = '',
  disabled = false,
  ...rest
}: Props) {
  const baseClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    'rounded-[var(--radius-md)]',
    'btn-interactive',
    'transition-colors',
    'duration-[var(--transition-fast)]',
  ].join(' ');

  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const variantClasses = {
    default: [
      'bg-[var(--color-surface-elevated)]',
      'text-[var(--color-text-secondary)]',
      'hover:text-[var(--color-text-primary)]',
    ].join(' '),
    primary: [
      'bg-[var(--color-primary)]/10',
      'text-[var(--color-primary)]',
      'hover:bg-[var(--color-primary)]/20',
    ].join(' '),
    ghost: [
      'bg-transparent',
      'text-[var(--color-text-muted)]',
      'hover:bg-[var(--color-surface)]',
      'hover:text-[var(--color-text-secondary)]',
    ].join(' '),
  };

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

  const classes = [baseClasses, sizeClasses[size], variantClasses[variant], disabledClasses, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} disabled={disabled} title={title} {...rest}>
      {icon}
    </button>
  );
}
