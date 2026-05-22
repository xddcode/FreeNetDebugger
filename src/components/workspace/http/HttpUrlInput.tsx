import { memo, useMemo } from 'react';
import { Box, Field, Input } from '@chakra-ui/react';
import { useDebouncedControlledValue } from '../../../hooks/useDebouncedControlledValue';
import { segmentUrlForPathHighlight } from '../../../utils/http';

interface HttpUrlInputProps {
  value: string;
  onChange: (value: string) => void;
  onLiveChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function HttpUrlInput({
  value,
  onChange,
  onLiveChange,
  placeholder,
  disabled,
}: HttpUrlInputProps) {
  const { draft, setDraft, flush } = useDebouncedControlledValue(value, onChange, 0);
  const segments = useMemo(() => segmentUrlForPathHighlight(draft), [draft]);

  return (
    <Field.Root>
      <Box
        position="relative"
        width="full"
        borderWidth="1px"
        borderColor="border"
        borderRadius="md"
        bg="bg.input"
        className="http-url-input"
        _focusWithin={{
          borderColor: 'blue.solid',
          boxShadow: '0 0 0 1px var(--chakra-colors-border-focus)',
        }}
      >
        <Input
          size="sm"
          width="full"
          colorPalette="blue"
          value={draft}
          disabled={disabled}
          placeholder={placeholder}
          className="http-url-input__field"
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            onLiveChange?.(next);
          }}
          onBlur={() => flush()}
          _placeholder={{ color: 'fg.subtle' }}
        />
        <Box
          aria-hidden
          className="http-url-input__mirror"
          fontFamily="mono"
          fontSize="sm"
        >
          {segments.map((segment, index) => (
            segment.kind === 'pathParam' ? (
              <span
                key={`${index}:${segment.text}`}
                className="http-url-input__placeholder"
              >
                {segment.text}
              </span>
            ) : (
              <span key={`${index}:${segment.text}`} className="http-url-input__text">
                {segment.text}
              </span>
            )
          ))}
        </Box>
      </Box>
    </Field.Root>
  );
}

export default memo(HttpUrlInput);
