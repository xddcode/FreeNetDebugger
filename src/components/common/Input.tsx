import type { ChangeEvent, InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export default function Input({
  value,
  onChange,
  placeholder,
  disabled = false,
  error = false,
  className = '',
  ...rest
}: Props) {
  const baseClasses = [
    'w-full',
    'h-9',
    'px-3',
    'text-sm',
    'rounded-[var(--radius-md)]',
    'bg-[var(--color-surface)]',
    'border',
    'border-[var(--color-border)]',
    'text-[var(--color-text-primary)]',
    'font-[family-name:var(--font-body)]',
    'outline-none',
    'transition-colors',
    'duration-[var(--transition-fast)]',
    'placeholder:text-[var(--color-text-muted)]',
    'focus:border-[var(--color-border-focus)]',
    'focus:shadow-[var(--shadow-glow-primary)]',
  ].join(' ');

  const errorClasses = error ? 'border-[var(--color-error)]' : '';
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

  const classes = [baseClasses, errorClasses, disabledClasses, className].filter(Boolean).join(' ');

  return (
    <input
      className={classes}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      {...rest}
    />
  );
}
