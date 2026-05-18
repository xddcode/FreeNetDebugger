import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export default function Card({ children, className = '', padding = 'md' }: Props) {
  const baseClasses = [
    'bg-[var(--color-surface)]',
    'border',
    'border-[var(--color-border)]',
    'rounded-[var(--radius-lg)]',
    'shadow-[var(--shadow-sm)]',
  ].join(' ');

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const classes = [baseClasses, paddingClasses[padding], className].filter(Boolean).join(' ');

  return <div className={classes}>{children}</div>;
}
