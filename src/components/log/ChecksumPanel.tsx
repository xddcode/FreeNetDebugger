import { useState, useMemo } from 'react';
import { Box, Button, Flex, Stack, Text, Textarea } from '@chakra-ui/react';
import { PanelCard, PanelHeader, FieldSelect } from '../sidebar/ui';
import { calculateChecksum } from '../../utils/checksum';
import type { ChecksumType } from '../../types';

const ALGORITHMS: { value: ChecksumType; label: string }[] = [
  { value: 'CRC8', label: 'CRC-8' },
  { value: 'CRC16', label: 'CRC-16 Modbus' },
  { value: 'CRC32', label: 'CRC-32' },
  { value: 'LRC', label: 'LRC' },
  { value: 'XOR', label: 'XOR' },
  { value: 'SUM8', label: 'SUM-8' },
];

export default function ChecksumPanel() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'HEX' | 'ASCII'>('HEX');
  const [algorithm, setAlgorithm] = useState<ChecksumType>('CRC16');

  const result = useMemo(() => {
    if (!input.trim()) { return null; }
    let bytes: number[];
    if (mode === 'HEX') {
      const cleaned = input.replace(/\s/g, '');
      if (!/^[0-9A-Fa-f]*$/.test(cleaned) || cleaned.length % 2 !== 0) {
        return null;
      }
      bytes = [];
      for (let i = 0; i < cleaned.length; i += 2) {
        bytes.push(parseInt(cleaned.slice(i, i + 2), 16));
      }
    } else {
      bytes = Array.from(new TextEncoder().encode(input));
    }
    if (bytes.length === 0) { return null; }
    const value = calculateChecksum(bytes, algorithm);
    const hex = typeof value === 'bigint'
      ? (value as bigint).toString(16).toUpperCase().padStart(8, '0')
      : value.toString(16).toUpperCase().padStart(value > 0xff ? 4 : 2, '0');
    return { value, hex, bytes: bytes.length };
  }, [input, mode, algorithm]);

  return (
    <PanelCard>
      <PanelHeader
        icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M9 9h6v6H9z" />
        </svg>}
        label="Checksum"
      />
      <Stack p="3" gap="2">
        <Flex align="center" gap="2">
          <Flex rounded="md" overflow="hidden" borderWidth="1px" borderColor="border">
            {(['HEX', 'ASCII'] as const).map((m) => (
              <Button
                key={m}
                onClick={() => setMode(m)}
                size="xs"
                variant={mode === m ? 'surface' : 'ghost'}
                colorPalette={mode === m ? 'blue' : 'gray'}
                fontFamily="mono"
                fontSize="2xs"
                rounded="none"
              >
                {m}
              </Button>
            ))}
          </Flex>
          <FieldSelect
            value={algorithm}
            onChange={(v) => setAlgorithm(v as ChecksumType)}
            options={ALGORITHMS}
          />
        </Flex>

        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'HEX' ? '01 02 FF ...' : 'Enter text...'}
          rows={3}
          resize="none"
          fontFamily="mono"
          fontSize="2xs"
        />

        {result ? (
          <Flex
            align="center"
            gap="3"
            px="3"
            py="2"
            rounded="md"
            bg="bg.subtle"
            borderWidth="1px"
            borderColor="border"
          >
            <Box flex="1">
              <Text fontSize="2xs" textTransform="uppercase" letterSpacing="wider" color="fg.subtle">
                Result
              </Text>
              <Text fontSize="sm" fontWeight="normal" fontFamily="mono" color="accent">
                0x{result.hex}
              </Text>
            </Box>
            <Box textAlign="right">
              <Text fontSize="2xs" textTransform="uppercase" letterSpacing="wider" color="fg.subtle">
                Decimal
              </Text>
              <Text fontSize="2xs" fontFamily="mono" color="fg.muted">
                {result.value.toString()}
              </Text>
            </Box>
            <Box textAlign="right">
              <Text fontSize="2xs" textTransform="uppercase" letterSpacing="wider" color="fg.subtle">
                Bytes
              </Text>
              <Text fontSize="2xs" fontFamily="mono" color="fg.muted">
                {result.bytes}
              </Text>
            </Box>
          </Flex>
        ) : input.trim() ? (
          <Text fontSize="2xs" color="danger">
            Invalid {mode} input
          </Text>
        ) : null}
      </Stack>
    </PanelCard>
  );
}
