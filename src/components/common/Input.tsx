import type { ChangeEvent, InputHTMLAttributes } from 'react';
import { Input as ChakraInput } from '@chakra-ui/react';

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
  className,
  ...rest
}: Props) {
  const { size: _htmlSize, ...inputRest } = rest;

  return (
    <ChakraInput
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      aria-invalid={error || undefined}
      size="sm"
      className={className}
      borderColor={error ? 'danger' : undefined}
      _placeholder={{ color: 'fg.subtle' }}
      {...inputRest}
    />
  );
}
