import type { SelectHTMLAttributes } from 'react';

interface Option {
  value: string;
  label: string;
}

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Option[];
  disabled?: boolean;
  className?: string;
}

export default function Select({
  value,
  onChange,
  options,
  disabled = false,
  className = '',
  ...rest
}: Props) {
  const baseClasses = [
    'w-full',
    'h-9',
    'px-3',
    'pr-8',
    'text-sm',
    'rounded-[var(--radius-md)]',
    'bg-[var(--color-surface)]',
    'border',
    'border-[var(--color-border)]',
    'text-[var(--color-text-primary)]',
    'font-[family-name:var(--font-body)]',
    'outline-none',
    'appearance-none',
    'transition-colors',
    'duration-[var(--transition-fast)]',
    'focus:border-[var(--color-border-focus)]',
    'focus:shadow-[var(--shadow-glow-primary)]',
  ].join(' ');

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

  const classes = [baseClasses, disabledClasses, className].filter(Boolean).join(' ');

  return (
    <div className="relative">
      <select className={classes} value={value} onChange={onChange} disabled={disabled} {...rest}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {/* Chevron overlay */}
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}
