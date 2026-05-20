import type { ChangeEvent } from 'react';
import { FieldSelect, type FieldSelectProps } from '../sidebar/ui';

interface Option {
  value: string;
  label: string;
}

interface Props extends Omit<FieldSelectProps, 'onChange' | 'options'> {
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: Option[];
}

/** Wraps FieldSelect (Chakra Select) for legacy onChange(event) callers. */
export default function Select({ onChange, ...rest }: Props) {
  return (
    <FieldSelect
      {...rest}
      onChange={(v) => {
        onChange({ target: { value: v } } as ChangeEvent<HTMLSelectElement>);
      }}
    />
  );
}
