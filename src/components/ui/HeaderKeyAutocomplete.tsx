import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { Box, Button, Portal } from '@chakra-ui/react';
import HttpKvCellInput from './HttpKvCellInput';

const COMMON_HTTP_HEADERS = [
  'Accept', 'Accept-Charset', 'Accept-Encoding', 'Accept-Language',
  'Authorization', 'Cache-Control', 'Connection', 'Content-Length',
  'Content-Type', 'Cookie', 'Host', 'If-Match', 'If-Modified-Since',
  'If-None-Match', 'Origin', 'Referer', 'User-Agent', 'X-Requested-With',
];

const DROPDOWN_MAX_HEIGHT = 192;
const DROPDOWN_GAP = 4;

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function measureDropdownPosition(anchor: HTMLElement, itemCount: number): DropdownPosition {
  const rect = anchor.getBoundingClientRect();
  const estimatedHeight = Math.min(itemCount * 32, DROPDOWN_MAX_HEIGHT);
  const spaceBelow = window.innerHeight - rect.bottom;
  const openAbove = spaceBelow < estimatedHeight + DROPDOWN_GAP
    && rect.top > estimatedHeight + DROPDOWN_GAP;

  return {
    top: openAbove ? rect.top - estimatedHeight - DROPDOWN_GAP : rect.bottom + DROPDOWN_GAP,
    left: rect.left,
    width: rect.width,
  };
}

export default function HeaderKeyAutocomplete({ value, onChange, placeholder, className }: Props) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [dropdownPos, setDropdownPos] = useState<DropdownPosition | null>(null);

  const matches = useMemo(() => {
    if (!value.trim()) {
      return [];
    }
    const lower = value.toLowerCase();
    return COMMON_HTTP_HEADERS.filter(
      (h) => h.toLowerCase().startsWith(lower) && h.toLowerCase() !== lower,
    ).slice(0, 6);
  }, [value]);

  const open = focused && matches.length > 0;

  const syncDropdownPosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) {
      return;
    }
    setDropdownPos(measureDropdownPosition(anchor, matches.length));
  }, [matches.length]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    syncDropdownPosition();
    const onReposition = () => syncDropdownPosition();
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [open, syncDropdownPosition]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || matches.length === 0) {
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => (i + 1) % matches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => (i - 1 + matches.length) % matches.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onChange(matches[highlighted]);
      setFocused(false);
    } else if (e.key === 'Escape') {
      setFocused(false);
    }
  };

  const selectMatch = (match: string) => {
    onChange(match);
    setFocused(false);
  };

  return (
    <Box ref={anchorRef} position="relative" width="full" minW="0">
      <HttpKvCellInput
        value={value}
        onChange={(v) => {
          onChange(v);
          setHighlighted(0);
        }}
        placeholder={placeholder}
        debounceMs={0}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 150)}
        className={className}
      />
      {open && dropdownPos && (
        <Portal>
          <Box
            position="fixed"
            top={`${dropdownPos.top}px`}
            left={`${dropdownPos.left}px`}
            width={`${dropdownPos.width}px`}
            bg="bg.panel"
            borderWidth="1px"
            borderColor="border"
            rounded="md"
            shadow="lg"
            zIndex="popover"
            maxH={`${DROPDOWN_MAX_HEIGHT}px`}
            overflowY="auto"
          >
            {matches.map((m, i) => (
              <Button
                key={m}
                variant="ghost"
                width="full"
                justifyContent="flex-start"
                height="auto"
                py="1.5"
                px="2"
                fontFamily="mono"
                fontSize="xs"
                color={i === highlighted ? 'accent' : 'fg'}
                bg={i === highlighted ? 'accent.subtle' : 'transparent'}
                _hover={{ bg: 'bg.subtle' }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectMatch(m);
                }}
              >
                {m}
              </Button>
            ))}
          </Box>
        </Portal>
      )}
    </Box>
  );
}
