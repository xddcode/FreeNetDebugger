import type { ReactNode } from 'react';
import { Checkbox, Flex, IconButton, Input } from '@chakra-ui/react';
import { CheckboxControl } from '../sidebar/ui';
import { Trash2 } from 'lucide-react';
import { useDebouncedControlledValue } from '../../hooks/useDebouncedControlledValue';
import { CONFIG_FIELD_DEBOUNCE_MS } from '../../config/constants';

interface Props {
  enabled: boolean;
  keyValue: string;
  value: string;
  onEnabledChange: (enabled: boolean) => void;
  onKeyChange: (value: string) => void;
  onValueChange: (value: string) => void;
  onRemove: () => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  keyField?: ReactNode;
  disabled?: boolean;
}

interface DebouncedTextInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Lightweight controlled input that keeps the user's keystrokes in a local
 * draft and only commits to the parent store after a short idle period
 * (or on blur). Prevents per-character store mutations from re-rendering
 * the whole header/param list while typing.
 */
function DebouncedTextInput({ value, onChange, placeholder, disabled }: DebouncedTextInputProps) {
  const { draft, setDraft, flush } = useDebouncedControlledValue(
    value,
    onChange,
    CONFIG_FIELD_DEBOUNCE_MS,
  );
  return (
    <Input
      flex="1"
      minW="0"
      size="xs"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => flush()}
      placeholder={placeholder}
      fontFamily="mono"
      fontSize="2xs"
      disabled={disabled}
    />
  );
}

export default function HttpKeyValueRow({
  enabled,
  keyValue,
  value,
  onEnabledChange,
  onKeyChange,
  onValueChange,
  onRemove,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  keyField,
  disabled = false,
}: Props) {
  return (
    <Flex
      align="center"
      gap="1.5"
      p="1.5"
      rounded="md"
      bg="bg.subtle"
      borderWidth="1px"
      borderColor="border"
    >
      <Checkbox.Root
        checked={enabled}
        onCheckedChange={(details) => onEnabledChange(details.checked === true)}
        colorPalette="blue"
        variant="outline"
        size="sm"
        disabled={disabled}
      >
        <Checkbox.HiddenInput />
        <CheckboxControl />
      </Checkbox.Root>
      {keyField ?? (
        <DebouncedTextInput
          value={keyValue}
          onChange={onKeyChange}
          placeholder={keyPlaceholder}
          disabled={disabled}
        />
      )}
      <DebouncedTextInput
        value={value}
        onChange={onValueChange}
        placeholder={valuePlaceholder}
        disabled={disabled}
      />
      <IconButton
        aria-label="Remove"
        title="Remove"
        size="xs"
        variant="ghost"
        color="danger"
        opacity={0.6}
        _hover={{ opacity: 1, bg: 'danger.subtle' }}
        onClick={onRemove}
        disabled={disabled}
      >
        <Trash2 size={14} />
      </IconButton>
    </Flex>
  );
}
