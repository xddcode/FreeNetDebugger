import { useMemo, type ComponentProps, type ReactNode } from 'react';
import { useDebouncedControlledValue } from '../../hooks/useDebouncedControlledValue';
import {
  Box,
  Card,
  Checkbox,
  createListCollection,
  Field,
  Flex,
  Input,
  NumberInput,
  Portal,
  RadioGroup as ChakraRadioGroup,
  Select,
  Text,
} from '@chakra-ui/react';

export function PanelCard({
  children,
  flexShrink = 0,
  ...rest
}: { children: ReactNode } & ComponentProps<typeof Card.Root>) {
  return (
    <Card.Root
      size="sm"
      variant="outline"
      bg="bg.panel"
      borderColor="border.emphasized"
      borderTopWidth="1px"
      borderTopColor="whiteAlpha.100"
      rounded="lg"
      shadow="sm"
      display="flex"
      flexDirection="column"
      overflow="hidden"
      flexShrink={flexShrink}
      {...rest}
    >
      {children}
    </Card.Root>
  );
}

export function PanelHeader({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <Flex
      align="center"
      gap="2"
      px="4"
      py="3"
      mb="2"
      flexShrink={0}
      borderBottomWidth="1px"
      borderColor="border"
    >
      <Box color="fg.muted" display="flex" alignItems="center" flexShrink={0}>
        {icon}
      </Box>
      <Text
        as="h3"
        fontSize="sm"
        lineHeight="normal"
        color="fg"
        fontFamily="body"
        fontWeight="normal"
      >
        {label}
      </Text>
    </Flex>
  );
}

export function FieldLabel({ seq, label }: { seq?: number; label: string }) {
  return (
    <Text
      as="label"
      display="block"
      mb="2.5"
      color="fg.muted"
      fontSize="2xs"
      fontFamily="mono"
      fontWeight="normal"
      lineHeight="label"
      letterSpacing="label"
    >
      {seq !== undefined && (
        <Text as="span" color="fg.subtle" fontSize="2xs" mr="1">
          {seq}.
        </Text>
      )}
      {label}
    </Text>
  );
}

export function FieldInput({
  value,
  onChange,
  onLiveChange,
  placeholder,
  type = 'text',
  disabled,
  error,
  debounceMs,
}: {
  value: string;
  onChange: (v: string) => void;
  onLiveChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  error?: boolean;
  debounceMs?: number;
}) {
  const { draft, setDraft, flush } = useDebouncedControlledValue(value, onChange, debounceMs);

  return (
    <Field.Root invalid={error}>
      <Input
        type={type === 'number' ? 'text' : type}
        inputMode={type === 'number' ? 'numeric' : undefined}
        colorPalette="blue"
        value={draft}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          onLiveChange?.(next);
        }}
        onBlur={() => flush()}
        placeholder={placeholder}
        disabled={disabled}
        size="sm"
        width="full"
        borderColor={error ? 'danger' : undefined}
        _placeholder={{ color: 'fg.subtle' }}
      />
    </Field.Root>
  );
}

export function FieldNumberInput({
  value,
  onChange,
  onLiveChange,
  min,
  max,
  step = 1,
  disabled,
  error,
  width = 'full',
  size = 'sm',
  textAlign,
  showControls = true,
  debounceMs,
}: {
  value: number;
  onChange: (v: number) => void;
  onLiveChange?: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  error?: boolean;
  width?: string | number;
  size?: 'xs' | 'sm' | 'md';
  textAlign?: 'left' | 'center' | 'right';
  showControls?: boolean;
  debounceMs?: number;
}) {
  const { draft, setDraft, flush } = useDebouncedControlledValue(value, onChange, debounceMs);

  return (
    <Field.Root invalid={error} width={width} flexShrink={width === 'full' ? undefined : 0}>
      <NumberInput.Root
        size={size}
        variant="outline"
        colorPalette="blue"
        value={String(draft)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        width={width}
        onValueChange={(details) => {
          const next = details.valueAsNumber;
          if (!Number.isNaN(next)) {
            setDraft(next);
            onLiveChange?.(next);
          }
        }}
      >
        <NumberInput.Input
          bg="bg.input"
          borderColor={error ? 'danger' : 'border'}
          boxShadow="none"
          color="fg"
          fontFamily="mono"
          textAlign={textAlign}
          onBlur={() => flush()}
          _focusVisible={{ boxShadow: '0 0 0 1px var(--chakra-colors-border-focus)' }}
        />
        {showControls ? <NumberInput.Control /> : null}
      </NumberInput.Root>
    </Field.Root>
  );
}

export type FieldSelectProps = {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  width?: string;
  flex?: string | number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  fontSize?: string;
  textTransform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
  height?: string | number;
  bg?: string;
  placeholder?: string;
};

export function FieldSelect({
  value,
  onChange,
  options,
  disabled,
  width = 'full',
  flex,
  size = 'sm',
  fontSize = 'sm',
  textTransform,
  height,
  bg = 'bg.input',
  placeholder,
}: FieldSelectProps) {
  const collection = useMemo(
    () => createListCollection({ items: options }),
    [options],
  );

  return (
    <Select.Root
      collection={collection}
      size={size}
      width={width}
      flex={flex}
      disabled={disabled}
      variant="outline"
      colorPalette="blue"
      value={value ? [value] : []}
      onValueChange={(details) => {
        const next = details.value[0];
        if (next !== undefined) {
          onChange(next);
        }
      }}
    >
      <Select.HiddenSelect />
      <Select.Control>
        <Select.Trigger
          bg={bg}
          borderColor="border"
          boxShadow="none"
          fontFamily="mono"
          fontSize={fontSize}
          fontWeight="normal"
          textTransform={textTransform}
          height={height}
          _focusVisible={{ boxShadow: '0 0 0 1px var(--chakra-colors-border-focus)' }}
        >
          <Select.ValueText placeholder={placeholder} />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content zIndex="popover" bg="bg.panel" borderColor="border">
            {collection.items.map((item) => (
              <Select.Item key={item.value} item={item} fontFamily="mono" fontSize={fontSize}>
                <Select.ItemText>{item.label}</Select.ItemText>
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
}

/** Chakra Checkbox control styled with app accent tokens (not gray/white default). */
export function CheckboxControl() {
  return (
    <Checkbox.Control
      bg="bg.input"
      borderWidth="1px"
      borderColor="border"
      _checked={{
        bg: 'accent',
        borderColor: 'accent',
        color: 'accent.fg',
      }}
      _focusVisible={{
        outline: '2px solid',
        outlineColor: 'accent',
        outlineOffset: '1px',
      }}
    >
      <Checkbox.Indicator />
    </Checkbox.Control>
  );
}

export function CheckRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  /** @deprecated accent styling is always applied via theme tokens */
  accent?: boolean;
}) {
  return (
    <Checkbox.Root
      checked={checked}
      onCheckedChange={(details) => onChange(details.checked === true)}
      colorPalette="blue"
      variant="outline"
      size="sm"
      py="1"
    >
      <Checkbox.HiddenInput />
      <CheckboxControl />
      <Checkbox.Label
        fontSize="sm"
        fontFamily="body"
        fontWeight="normal"
        color="fg.subtle"
        userSelect="none"
        _hover={{ color: 'fg' }}
      >
        {label}
      </Checkbox.Label>
    </Checkbox.Root>
  );
}

export type RadioGroupOption = { value: string; label: string };

export function RadioGroupRow({
  options,
  value,
  onChange,
  accent,
}: {
  options: RadioGroupOption[] | string[];
  value: string;
  onChange: (v: string) => void;
  accent?: boolean;
}) {
  const items: RadioGroupOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt,
  );

  return (
    <ChakraRadioGroup.Root
      value={value}
      onValueChange={(details) => onChange(details.value ?? '')}
      colorPalette={accent ? 'blue' : 'gray'}
      size="sm"
      width="full"
    >
      <Flex align="center" gap="4" width="full" py="2" flexWrap="wrap">
        {items.map((opt) => (
          <ChakraRadioGroup.Item key={opt.value} value={opt.value} gap="1.5">
            <ChakraRadioGroup.ItemHiddenInput />
            <ChakraRadioGroup.ItemIndicator />
            <ChakraRadioGroup.ItemText
              fontSize="sm"
              fontFamily="body"
              fontWeight="normal"
              color="fg.subtle"
              whiteSpace="nowrap"
              _hover={{ color: 'fg' }}
            >
              {opt.label}
            </ChakraRadioGroup.ItemText>
          </ChakraRadioGroup.Item>
        ))}
      </Flex>
    </ChakraRadioGroup.Root>
  );
}

/** @deprecated Use RadioGroupRow — kept for existing imports */
export const RadioGroup = RadioGroupRow;
