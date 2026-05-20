import { useRef, useMemo, useCallback, useState, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  IconButton,
  Text,
} from '@chakra-ui/react';
import { SearchInput } from '../ui/SearchInput';
import { Plug, Clock, ArrowUp, ArrowDown, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useSessionStore, useLogStore } from '../../store';
import type { Session, LogEntry, EncodingMode, AsciiNonPrintableMode } from '../../types';
import {
  bytesToDisplay, bytesToHexText, bytesToHex,
} from '../../utils/encoding';
import { showToast } from '../../store/toastStore';
import {
  LOG_VIRTUALIZER_OVERSCAN,
  LOG_ESTIMATE_SIZE,
  LOG_SCROLL_BOTTOM_THRESHOLD,
  LOG_FILTER_DEBOUNCE_MS,
  LOG_TABLE_COLUMNS,
  LOG_TABLE_COLUMN_GAP,
  TRAFFIC_RX_COLOR,
  TRAFFIC_RX_PALETTE,
  TRAFFIC_TX_COLOR,
  TRAFFIC_TX_PALETTE,
} from '../../config/constants';

interface Props { session: Session }

function fmtTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number, len = 2) => n.toString().padStart(len, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

type LogPayloadColor =
  | typeof TRAFFIC_RX_COLOR
  | typeof TRAFFIC_TX_COLOR
  | 'success'
  | 'danger'
  | 'fg.subtle';

type SystemLogKind = 'success' | 'info' | 'error';

interface RowData {
  time: string;
  dir: 'TX' | 'RX' | 'SYS' | 'ERR';
  dirIcon: 'up' | 'down' | 'warn' | 'ok' | 'info';
  payloadColor: LogPayloadColor;
  hexText?: string;
  asciiText?: string;
  plainText?: string;
  len: string;
  isError: boolean;
  rawHex: string;
  rawText: string;
}

function classifySystemLog(text: string, empty: boolean): { kind: SystemLogKind; isError: boolean } {
  if (empty || /error|timeout|fail/i.test(text)) {
    return { kind: 'error', isError: true };
  }
  if (
    /^Connected to\b/i.test(text) ||
    /^Listening on\b/i.test(text) ||
    /^Client connected:/i.test(text)
  ) {
    return { kind: 'success', isError: false };
  }
  return { kind: 'info', isError: false };
}

function systemLogStyle(kind: SystemLogKind): { payloadColor: LogPayloadColor; dirIcon: RowData['dirIcon'] } {
  switch (kind) {
    case 'success':
      return { payloadColor: 'success', dirIcon: 'ok' };
    case 'error':
      return { payloadColor: 'danger', dirIcon: 'warn' };
    default:
      return { payloadColor: 'fg.subtle', dirIcon: 'info' };
  }
}

function buildRowData(
  entry: LogEntry,
  encoding: EncodingMode,
  asciiMode: AsciiNonPrintableMode,
): RowData {
  const isRecv = entry.direction === 'recv';
  const isSys = entry.direction === 'system';

  const text = new TextDecoder().decode(new Uint8Array(entry.data));

  if (isSys) {
    const { kind, isError } = classifySystemLog(text, entry.data.length === 0);
    const { payloadColor, dirIcon } = systemLogStyle(kind);
    return {
      time: fmtTime(entry.timestamp),
      dir: isError ? 'ERR' : 'SYS',
      dirIcon,
      payloadColor,
      plainText: text,
      len: '-',
      isError,
      rawHex: '',
      rawText: text,
    };
  }

  const dir = isRecv ? 'RX' : 'TX';
  const dirIcon = isRecv ? 'down' : 'up';
  const payloadColor: LogPayloadColor = isRecv ? TRAFFIC_RX_COLOR : TRAFFIC_TX_COLOR;

  const rawHex = bytesToHex(entry.data);
  const rawText = new TextDecoder().decode(new Uint8Array(entry.data));

  if (encoding === 'HEX_TEXT') {
    const dual = bytesToHexText(entry.data, asciiMode);
    return {
      time: fmtTime(entry.timestamp),
      dir,
      dirIcon,
      payloadColor,
      hexText: dual.hex,
      asciiText: dual.text,
      len: entry.data.length.toLocaleString(),
      isError: false,
      rawHex,
      rawText,
    };
  }

  return {
    time: fmtTime(entry.timestamp),
    dir,
    dirIcon,
    payloadColor,
    plainText: bytesToDisplay(entry.data, encoding, asciiMode),
    len: entry.data.length.toLocaleString(),
    isError: false,
    rawHex,
    rawText,
  };
}

function copyToClipboard(text: string) {
  void window.navigator.clipboard.writeText(text);
}

const LogRow = memo(function LogRow({
  entry,
  encoding,
  asciiMode,
  autoNewline,
  isSelected,
  onSelect,
}: {
  entry: LogEntry;
  encoding: EncodingMode;
  asciiMode: AsciiNonPrintableMode;
  autoNewline: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const data = useMemo(
    () => buildRowData(entry, encoding, asciiMode),
    [entry, encoding, asciiMode],
  );

  const recvSpacer = autoNewline && entry.direction === 'recv';
  const showCopyActions = !data.isError && data.len !== '-';

  return (
    <Grid
      className="group"
      templateColumns={LOG_TABLE_COLUMNS}
      columnGap={LOG_TABLE_COLUMN_GAP}
      px="3"
      py="2"
      pb={recvSpacer ? '4' : '2'}
      borderBottomWidth="1px"
      borderColor="border"
      alignItems="flex-start"
      fontFamily="mono"
      fontSize="2xs"
      cursor="pointer"
      bg={isSelected ? 'accent.subtle' : 'transparent'}
      _hover={{ bg: isSelected ? 'accent.subtle' : 'bg.subtle' }}
      onClick={onSelect}
    >
      <Text
        color="fg.subtle"
        fontSize="2xs"
        lineHeight="1.6"
        userSelect="none"
        whiteSpace="nowrap"
      >
        {data.time}
      </Text>

      <Flex justify="center" pt="0.5">
        <DirGlyph icon={data.dirIcon} color={data.payloadColor} />
      </Flex>

      <Box minW="0">
        {data.hexText && data.asciiText ? (
          <HexAsciiPayload hex={data.hexText} ascii={data.asciiText} color={data.payloadColor} />
        ) : (
          <Text color={data.payloadColor} wordBreak="break-all" lineHeight="1.6" whiteSpace="pre-wrap">
            {data.plainText}
          </Text>
        )}
      </Box>

      <Flex
        position="relative"
        justify="flex-end"
        align="center"
        minH="5"
        pt="0.5"
        flexShrink={0}
      >
        <Text
          color="fg.subtle"
          fontSize="2xs"
          lineHeight="1.6"
          whiteSpace="nowrap"
          className={showCopyActions ? 'transition-opacity group-hover:opacity-0' : undefined}
        >
          {data.len}
        </Text>
        {showCopyActions && (
          <Flex
            position="absolute"
            right="0"
            top="0"
            gap="0.5"
            className="pointer-events-none opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
          >
            <IconButton
              aria-label="Copy HEX"
              title="Copy HEX"
              size="xs"
              variant="ghost"
              color="fg.subtle"
              _hover={{ color: 'accent', bg: 'accent.subtle' }}
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(data.rawHex);
                showToast('success', 'Copied HEX');
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            </IconButton>
            <IconButton
              aria-label="Copy ASCII"
              title="Copy ASCII"
              size="xs"
              variant="ghost"
              color="fg.subtle"
              _hover={{ color: 'accent', bg: 'accent.subtle' }}
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(data.rawText);
                showToast('success', 'Copied text');
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </IconButton>
          </Flex>
        )}
      </Flex>
    </Grid>
  );
}, (prev, next) =>
  prev.entry.id === next.entry.id &&
  prev.encoding === next.encoding &&
  prev.asciiMode === next.asciiMode &&
  prev.autoNewline === next.autoNewline &&
  prev.isSelected === next.isSelected,
);

function DirGlyph({ icon, color }: { icon: RowData['dirIcon']; color: LogPayloadColor }) {
  const iconProps = { size: 14, strokeWidth: 2.25 };

  return (
    <Box color={color} lineHeight={0} aria-hidden display="flex">
      {icon === 'up' ? (
        <ArrowUp {...iconProps} />
      ) : icon === 'down' ? (
        <ArrowDown {...iconProps} />
      ) : icon === 'ok' ? (
        <CheckCircle2 {...iconProps} />
      ) : icon === 'info' ? (
        <Info {...iconProps} />
      ) : (
        <AlertTriangle {...iconProps} />
      )}
    </Box>
  );
}

/** Design: hex groups + ASCII on the same line, direction-colored, 16 bytes per row. */
function HexAsciiPayload({ hex, ascii, color }: { hex: string; ascii: string; color: LogPayloadColor }) {
  const bytes = hex.split(' ').filter(Boolean);
  const bytesPerLine = 16;
  const lines: { hexLine: string; asciiLine: string }[] = [];

  for (let i = 0; i < bytes.length; i += bytesPerLine) {
    const chunk = bytes.slice(i, i + bytesPerLine);
    lines.push({
      hexLine: chunk.join(' '),
      asciiLine: ascii.slice(i, i + bytesPerLine),
    });
  }

  return (
    <Box>
      {lines.map((line, idx) => (
        <Text key={idx} color={color} lineHeight="1.6" wordBreak="break-all">
          {line.hexLine}
          {line.asciiLine ? (
            <>
              <Text as="span" opacity={0.45}>
                {'    '}
              </Text>
              <Text as="span" opacity={0.92}>
                {line.asciiLine}
              </Text>
            </>
          ) : null}
        </Text>
      ))}
    </Box>
  );
}


export default function DataLog({ session }: Props) {
  const { t } = useTranslation();
  const logFilter = useLogStore(s => s.logFilter);
  const setLogFilter = useLogStore(s => s.setLogFilter);
  const clearLogs = useSessionStore(s => s.clearLogs);

  const [inputValue, setInputValue] = useState(logFilter);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setLogFilter(inputValue), LOG_FILTER_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [inputValue, setLogFilter]);

  useEffect(() => {
    setInputValue(logFilter);
  }, [logFilter]);

  const parentRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);

  const asciiMode = session.receiveSettings.asciiNonPrintable ?? 'DOT';

  const filteredLogs = useMemo(() => {
    if (!logFilter.trim()) {
      return session.logs;
    }
    const q = logFilter.toLowerCase();
    return session.logs.filter(e =>
      bytesToDisplay(e.data, session.receiveSettings.encoding, asciiMode).toLowerCase().includes(q),
    );
  }, [session.logs, logFilter, session.receiveSettings.encoding, asciiMode]);

  // Stats
  const stats = useMemo(() => {
    let rx = 0, tx = 0, sys = 0;
    for (const e of filteredLogs) {
      if (e.direction === 'recv') {
        rx++;
      } else if (e.direction === 'send') {
        tx++;
      } else {
        sys++;
      }
    }
    return { rx, tx, sys };
  }, [filteredLogs]);

  const getEstimateSize = useCallback(() => LOG_ESTIMATE_SIZE, []);
  const getItemKey = useCallback(
    (i: number) => filteredLogs[i]?.id ?? i,
    [filteredLogs],
  );

  const virtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: getEstimateSize,
    getItemKey,
    overscan: LOG_VIRTUALIZER_OVERSCAN,
  });

  const prevCountRef = useRef(0);
  useEffect(() => {
    if (filteredLogs.length !== prevCountRef.current) {
      prevCountRef.current = filteredLogs.length;
      if (atBottom.current && filteredLogs.length > 0) {
        virtualizer.scrollToIndex(filteredLogs.length - 1, { align: 'end' });
      }
    }
  }, [filteredLogs.length, virtualizer]);

  const handleScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) { return; }
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < LOG_SCROLL_BOTTOM_THRESHOLD;
  }, []);

  return (
    <Flex direction="column" h="full" userSelect="text">
      <Flex
        align="center"
        justify="space-between"
        px="3"
        py="1.5"
        flexShrink={0}
        borderBottomWidth="1px"
        borderColor="border"
        bgGradient="to-r"
        gradientFrom="accent.subtle"
        gradientTo="transparent"
      >
        <Flex align="center" gap="2" borderLeftWidth="2px" borderColor="accent" pl="2">
          <Heading fontSize="sm" lineHeight="normal" color="fg" fontWeight="normal">
            {t('log.title')}
          </Heading>
          {session.logs.length > 0 && (
            <Text fontSize="2xs" color="fg.subtle" fontFamily="mono">
              {session.logs.length.toLocaleString()}
            </Text>
          )}
        </Flex>
        <Flex align="center" gap="2">
          {filteredLogs.length > 0 && (
            <Flex align="center" gap="1" mr="2">
              {stats.rx > 0 && (
                <Badge size="sm" colorPalette={TRAFFIC_RX_PALETTE} variant="subtle" fontSize="2xs">
                  RX {stats.rx}
                </Badge>
              )}
              {stats.tx > 0 && (
                <Badge size="sm" colorPalette={TRAFFIC_TX_PALETTE} variant="subtle" fontSize="2xs">
                  TX {stats.tx}
                </Badge>
              )}
              {stats.sys > 0 && (
                <Badge size="sm" colorPalette="gray" variant="subtle" fontSize="2xs">
                  SYS {stats.sys}
                </Badge>
              )}
            </Flex>
          )}
          <Button
            size="xs"
            variant="outline"
            colorPalette="red"
            fontSize="2xs"
            fontFamily="mono"
            onClick={() => {
              clearLogs(session.id);
              showToast('info', 'Logs cleared');
            }}
          >
            {t('log.clear')}
          </Button>
        </Flex>
      </Flex>

      <Flex
        align="center"
        px="3"
        py="1.5"
        flexShrink={0}
        bg="bg.subtle"
        borderBottomWidth="1px"
        borderColor="border"
      >
        <SearchInput
          flex="1"
          minW="0"
          value={inputValue}
          onChange={setInputValue}
          placeholder={t('log.searchPlaceholder')}
          clearAriaLabel={t('log.clear')}
        />
      </Flex>

      <Grid
        templateColumns={LOG_TABLE_COLUMNS}
        columnGap={LOG_TABLE_COLUMN_GAP}
        px="3"
        py="1.5"
        flexShrink={0}
        bg="bg"
        borderBottomWidth="1px"
        borderColor="border"
        fontFamily="mono"
        fontSize="2xs"
        color="fg.subtle"
        textTransform="uppercase"
        letterSpacing="wider"
        userSelect="none"
        alignItems="center"
      >
        <Box whiteSpace="nowrap">{t('log.colTime')}</Box>
        <Box textAlign="center" whiteSpace="nowrap">
          {t('log.colDir')}
        </Box>
        <Box minW="0">{t('log.colData')}</Box>
        <Box textAlign="right" whiteSpace="nowrap">
          {t('log.colLen')}
        </Box>
      </Grid>

      <Box
        ref={parentRef}
        flex="1"
        overflowY="auto"
        position="relative"
        bg="bg"
        userSelect="text"
        onScroll={handleScroll}
      >
        {filteredLogs.length === 0 ? (
          <Flex
            direction="column"
            align="center"
            justify="center"
            gap="3"
            h="full"
            position="relative"
            zIndex={20}
            color="fg.subtle"
            fontFamily="mono"
            fontSize="sm"
          >
            {session.status === 'idle' || session.status === 'error' ? (
              <Plug size={48} strokeWidth={1.2} opacity={0.4} />
            ) : (
              <Clock size={48} strokeWidth={1.2} opacity={0.4} />
            )}
            <Text>
              {session.status === 'idle' || session.status === 'error'
                ? t('log.connectFirst')
                : t('log.waiting')}
            </Text>
          </Flex>
        ) : (
          <Box position="relative" zIndex={20} height={`${virtualizer.getTotalSize()}px`}>
            {virtualizer.getVirtualItems().map((vItem) => (
              <Box
                key={vItem.key}
                data-index={vItem.index}
                ref={virtualizer.measureElement}
                position="absolute"
                insetX="0"
                top={`${vItem.start}px`}
              >
                <LogRow
                  entry={filteredLogs[vItem.index]}
                  encoding={session.receiveSettings.encoding}
                  asciiMode={asciiMode}
                  autoNewline={session.receiveSettings.autoNewline}
                  isSelected={selectedId === filteredLogs[vItem.index].id}
                  onSelect={() => setSelectedId(filteredLogs[vItem.index].id)}
                />
              </Box>
            ))}
          </Box>
        )}

        {(session.status === 'connected' || session.status === 'listening') && (
          <Box position="relative" zIndex={20} px="4" pb="2" fontFamily="mono" color="accent" fontWeight="bold">
            <span className="blink">_</span>
          </Box>
        )}
      </Box>
    </Flex>
  );
}
