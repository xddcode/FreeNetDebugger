import type { ReactNode } from 'react';

interface Props {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  children: ReactNode;
  className?: string;
}

export default function Badge({ variant = 'default', children, className = '' }: Props) {
  const baseClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    'rounded-full',
    'px-2',
    'py-0.5',
    'text-xs',
    'font-medium',
  ].join(' ');

  const variantClasses = {
    default: ['bg-[var(--color-surface-elevated)]', 'text-[var(--color-text-secondary)]'].join(' '),
    primary: ['bg-[var(--color-primary)]/20', 'text-[var(--color-primary)]'].join(' '),
    success: ['bg-[var(--color-success)]/20', 'text-[var(--color-success)]'].join(' '),
    warning: ['bg-[var(--color-warning)]/20', 'text-[var(--color-warning)]'].join(' '),
    error: ['bg-[var(--color-error)]/20', 'text-[var(--color-error)]'].join(' '),
  };

  const classes = [baseClasses, variantClasses[variant], className].filter(Boolean).join(' ');

  return <span className={classes}>{children}</span>;
}
