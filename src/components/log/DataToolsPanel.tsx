import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  Flex,
  SegmentGroup,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react';
import ChecksumPanel from './ChecksumPanel';
import JsonViewer from './JsonViewer';
import ProtocolParser from './ProtocolParser';

type ToolTab = 'checksum' | 'json' | 'protocol';

const TAB_ITEMS = [
  { value: 'checksum', label: 'Checksum' },
  { value: 'json', label: 'JSON' },
  { value: 'protocol', label: 'Protocol' },
];

export default function DataToolsPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ToolTab>('checksum');
  const [jsonInput, setJsonInput] = useState('');
  const [protocolInput, setProtocolInput] = useState('');

  const parseProtocolBytes = (input: string): number[] => {
    const cleaned = input.replace(/\s/g, '');
    if (!/^[0-9A-Fa-f]*$/.test(cleaned) || cleaned.length % 2 !== 0) {
      return [];
    }
    const bytes: number[] = [];
    for (let i = 0; i < cleaned.length; i += 2) {
      bytes.push(parseInt(cleaned.slice(i, i + 2), 16));
    }
    return bytes;
  };

  return (
    <Card.Root size="sm" variant="outline" bg="bg.panel" borderColor="border" flexShrink={0}>
      <Button
        variant="ghost"
        width="full"
        height="auto"
        py="2"
        px="3"
        justifyContent="space-between"
        onClick={() => setOpen((o) => !o)}
        borderBottomWidth={open ? '1px' : '0'}
        borderColor="border"
        bgGradient="to-r"
        gradientFrom="accent.subtle"
        gradientTo="transparent"
        roundedTop="lg"
        roundedBottom={open ? 'none' : 'lg'}
      >
        <Flex align="center" gap="2">
          <Box color="warning">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </Box>
          <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="warning" fontFamily="mono">
            Data Tools
          </Text>
        </Flex>
        <Box
          as="span"
          transform={open ? 'rotate(180deg)' : 'rotate(0deg)'}
          transition="transform 0.2s"
          color="fg.subtle"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="2,4 6,8 10,4" />
          </svg>
        </Box>
      </Button>

      {open && (
        <Card.Body p="2">
          <Stack gap="2">
            <SegmentGroup.Root
              value={tab}
              onValueChange={(details) => setTab(details.value as ToolTab)}
              size="sm"
              width="full"
            >
              <SegmentGroup.Indicator />
              <SegmentGroup.Items items={TAB_ITEMS} flex="1" fontSize="2xs" />
            </SegmentGroup.Root>

            {tab === 'checksum' && <ChecksumPanel />}

            {tab === 'json' && (
              <>
                <Textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder="Paste JSON here..."
                  rows={3}
                  fontSize="2xs"
                  fontFamily="mono"
                  resize="none"
                />
                <JsonViewer data={jsonInput} />
              </>
            )}

            {tab === 'protocol' && (
              <>
                <Textarea
                  value={protocolInput}
                  onChange={(e) => setProtocolInput(e.target.value)}
                  placeholder="Hex bytes: 01 02 FF ..."
                  rows={2}
                  fontSize="2xs"
                  fontFamily="mono"
                  resize="none"
                />
                <ProtocolParser data={parseProtocolBytes(protocolInput)} />
              </>
            )}
          </Stack>
        </Card.Body>
      )}
    </Card.Root>
  );
}
