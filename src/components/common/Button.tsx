import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  className?: string;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled = false,
  ...rest
}: Props) {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-[var(--radius-md)] transition-colors duration-[var(--transition-fast)] ease-in-out btn-interactive';

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-4 text-sm',
    lg: 'h-11 px-6 text-sm',
  };

  const variantClasses = {
    primary: [
      'bg-[var(--color-primary)]',
      'text-[var(--color-text-inverse)]',
      'hover:bg-[var(--color-primary-dim)]',
      'border-none',
    ].join(' '),
    secondary: [
      'bg-[var(--color-surface-elevated)]',
      'text-[var(--color-text-primary)]',
      'border',
      'border-[var(--color-border)]',
      'hover:bg-[var(--color-surface)]',
    ].join(' '),
    ghost: [
      'bg-transparent',
      'text-[var(--color-text-secondary)]',
      'hover:bg-[var(--color-surface)]',
      'border-none',
    ].join(' '),
    danger: [
      'bg-[var(--color-error)]/20',
      'text-[var(--color-error)]',
      'border',
      'border-[var(--color-error)]/40',
      'hover:bg-[var(--color-error)]/30',
    ].join(' '),
  };

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

  const classes = [baseClasses, sizeClasses[size], variantClasses[variant], disabledClasses, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}
