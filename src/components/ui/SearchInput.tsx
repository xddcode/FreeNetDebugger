import type { ComponentProps } from 'react';
import { CloseButton, Input, InputGroup } from '@chakra-ui/react';
import { Search } from 'lucide-react';

type InputProps = ComponentProps<typeof Input>;

export function SearchInput({
  value,
  onChange,
  placeholder,
  size = 'xs',
  clearAriaLabel = 'Clear',
  flex,
  minW,
  maxW,
  width = 'full',
  ...inputRest
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  clearAriaLabel?: string;
  size?: InputProps['size'];
} & Omit<InputProps, 'value' | 'onChange' | 'size'>) {
  return (
    <InputGroup
      width={width}
      flex={flex}
      minW={minW}
      maxW={maxW}
      startElement={<Search size={13} strokeWidth={2} />}
      endElement={
        value ? (
          <CloseButton
            size={size}
            onClick={() => onChange('')}
            aria-label={clearAriaLabel}
          />
        ) : undefined
      }
    >
      <Input
        colorPalette="blue"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        size={size}
        fontFamily="mono"
        fontSize="2xs"
        {...inputRest}
      />
    </InputGroup>
  );
}
