import type { FocusEventHandler, KeyboardEventHandler } from 'react';
import { useDebouncedControlledValue } from '../../hooks/useDebouncedControlledValue';
import { CONFIG_FIELD_DEBOUNCE_MS } from '../../config/constants';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** 0 = fully controlled by parent, no internal draft */
  debounceMs?: number;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  className?: string;
}

function DebouncedHttpKvCellInput({
  value,
  onChange,
  placeholder,
  disabled,
  debounceMs,
  onKeyDown,
  onFocus,
  onBlur,
  className,
}: Props & { debounceMs: number }) {
  const debounce = debounceMs > 0 ? debounceMs : undefined;
  const { draft, setDraft, flush } = useDebouncedControlledValue(
    value,
    onChange,
    debounce,
  );
  const classNames = ['http-kv-cell-input', className].filter(Boolean).join(' ');

  return (
    <input
      type="text"
      className={classNames}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => {
        flush();
        onBlur?.(e);
      }}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

export default function HttpKvCellInput({
  value,
  onChange,
  placeholder,
  disabled,
  debounceMs = CONFIG_FIELD_DEBOUNCE_MS,
  onKeyDown,
  onFocus,
  onBlur,
  className,
}: Props) {
  const classNames = ['http-kv-cell-input', className].filter(Boolean).join(' ');

  if (debounceMs === 0) {
    return (
      <input
        type="text"
        className={classNames}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
      />
    );
  }

  return (
    <DebouncedHttpKvCellInput
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      debounceMs={debounceMs}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      className={className}
    />
  );
}
