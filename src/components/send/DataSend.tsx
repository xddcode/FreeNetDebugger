import { useRef, useEffect, useCallback, useState, type KeyboardEvent, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Checkbox,
  Flex,
  IconButton,
  SegmentGroup,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react';
import { invoke } from '../../utils/tauri';
import { CheckboxControl, FieldNumberInput } from '../sidebar/ui';
import { CONFIG_FIELD_DEBOUNCE_MS } from '../../config/constants';
import { useSessionStore } from '../../store';
import { sendPanelBus } from '../../utils/sendPanelBus';
import { showToast } from '../../store/toastStore';
import type { EncodingMode, StreamSession } from '../../types';
import { asciiToBytes, hexToBytes, parseEscapeSequences } from '../../utils/encoding';
import { appendChecksum } from '../../utils/checksum';

interface Props {
  session: StreamSession;
}

const SEND_CONTENT_SYNC_MS = 300;

export default function DataSend({ session }: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(session.sendContent ?? '');
  const draftRef = useRef(draft);
  const syncTimerRef = useRef<number | null>(null);
  const updateSendContent = useSessionStore((s) => s.updateSendContent);
  const updateSendSettings = useSessionStore((s) => s.updateSendSettings);
  const appendLog = useSessionStore((s) => s.appendLog);
  const addSendHistory = useSessionStore((s) => s.addSendHistory);
  const clearSendHistory = useSessionStore((s) => s.clearSendHistory);
  const addTxBytes = useSessionStore((s) => s.addTxBytes);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const periodicRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const flushDraft = useCallback(
    (content?: string) => {
      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      const next = content ?? draftRef.current;
      if (next === session.sendContent) { return; }
      updateSendContent(session.id, next);
    },
    [session.id, session.sendContent, updateSendContent],
  );

  const scheduleDraftSync = useCallback(
    (content: string) => {
      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current);
      }
      syncTimerRef.current = window.setTimeout(() => {
        syncTimerRef.current = null;
        updateSendContent(session.id, content);
      }, SEND_CONTENT_SYNC_MS);
    },
    [session.id, updateSendContent],
  );

  const setText = useCallback(
    (value: string) => {
      setDraft(value);
      scheduleDraftSync(value);
    },
    [scheduleDraftSync],
  );

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    setDraft(session.sendContent ?? '');
    // Only reload draft when switching sessions — not on every store sync while typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  useEffect(() => {
    return () => {
      flushDraft();
    };
  }, [session.id, flushDraft]);

  const { sendSettings } = session;
  const canSend = session.status === 'connected' || session.status === 'listening';

  const stopPeriodic = () => {
    if (periodicRef.current !== null) {
      clearInterval(periodicRef.current);
      periodicRef.current = null;
    }
  };

  const buildPayload = useCallback(
    (input: string, overrideEncoding?: EncodingMode): number[] => {
      const mode =
        overrideEncoding === 'HEX' || overrideEncoding === 'ASCII'
          ? overrideEncoding
          : sendSettings.encoding;
      if (mode === 'HEX') {
        let b = hexToBytes(input);
        if (sendSettings.autoChecksum) {
          b = appendChecksum(b, sendSettings.checksumType);
        }
        return b;
      }
      let s = input;
      if (sendSettings.autoParseEscapes) {
        s = parseEscapeSequences(s);
      }
      if (sendSettings.autoCRLF && !s.endsWith('\r\n')) {
        s += '\r\n';
      }
      let b = asciiToBytes(s);
      if (sendSettings.autoChecksum) {
        b = appendChecksum(b, sendSettings.checksumType);
      }
      return b;
    },
    [sendSettings],
  );

  const doSend = useCallback(
    async (overrideText?: string, overrideEncoding?: EncodingMode) => {
      const raw = overrideText ?? draftRef.current;
      if (!canSend || !raw.trim()) {
        return;
      }

      const payload = buildPayload(raw, overrideEncoding);
      if (payload.length === 0) {
        return;
      }
      try {
        await invoke('send_data', { id: session.id, data: payload });
        appendLog(session.id, { timestamp: Date.now(), direction: 'send', data: payload });
        addTxBytes(session.id, payload.length);
        addSendHistory(session.id, raw.trim());
      } catch (e) {
        appendLog(session.id, {
          timestamp: Date.now(),
          direction: 'system',
          data: Array.from(new TextEncoder().encode(`${t('send.sendFailed')}: ${e}`)),
        });
        showToast('error', `${t('toast.sendFailed')}: ${e}`);
      }
    },
    [canSend, session.id, buildPayload, appendLog, addSendHistory, addTxBytes, t],
  );

  useEffect(() => {
    const unsub = sendPanelBus.on((nextText, enc, sendNow, append) => {
      const effectiveEncoding: 'ASCII' | 'HEX' = enc === 'HEX' ? 'HEX' : 'ASCII';
      if (effectiveEncoding !== sendSettings.encoding) {
        updateSendSettings(session.id, { encoding: effectiveEncoding });
      }
      const mergedText = append
        ? (() => {
            const current = draftRef.current;
            if (!current.trim()) {
              return nextText;
            }
            const separator = effectiveEncoding === 'HEX' ? ' ' : '\n';
            return `${current}${separator}${nextText}`;
          })()
        : nextText;

      setDraft(mergedText);
      flushDraft(mergedText);
      if (sendNow) {
        void doSend(mergedText, effectiveEncoding);
      }
    });
    return unsub;
  }, [session.id, flushDraft, updateSendSettings, doSend, sendSettings.encoding]);

  useEffect(() => {
    stopPeriodic();
    if (sendSettings.periodicEnabled && canSend) {
      periodicRef.current = setInterval(() => doSend(), sendSettings.periodicInterval);
    }
    return () => {
      stopPeriodic();
    };
  }, [sendSettings.periodicEnabled, sendSettings.periodicInterval, canSend, doSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      doSend();
    }
  };

  const handleFileOpen = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === 'string') {
        setText(content);
        showToast('success', t('toast.fileOpened'));
      } else if (content instanceof ArrayBuffer) {
        const bytes = Array.from(new Uint8Array(content));
        setText(bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' '));
        showToast('success', t('toast.fileOpened'));
      }
    };
    reader.onerror = () => {
      showToast('error', t('toast.fileOpenFailed'));
    };
    if (sendSettings.encoding === 'HEX') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const formatOptions: { key: EncodingMode; label: string }[] = [
    { key: 'ASCII', label: 'ASCII' },
    { key: 'HEX', label: 'HEX' },
    { key: 'UTF8', label: 'UTF-8' },
  ];

  return (
    <Stack gap="3" p="4">
      <Flex align="center" justify="space-between">
        <SegmentGroup.Root
          value={sendSettings.encoding}
          onValueChange={(details) =>
            updateSendSettings(session.id, { encoding: details.value as EncodingMode })
          }
          size="sm"
        >
          <SegmentGroup.Indicator />
          <SegmentGroup.Items
            items={formatOptions.map((o) => ({ value: o.key, label: o.label }))}
            fontFamily="mono"
            fontSize="xs"
          />
        </SegmentGroup.Root>

        <Checkbox.Root
          checked={sendSettings.autoCRLF}
          onCheckedChange={(details) =>
            updateSendSettings(session.id, { autoCRLF: details.checked === true })
          }
          colorPalette="blue"
          variant="outline"
          size="sm"
        >
          <Checkbox.HiddenInput />
          <CheckboxControl />
          <Checkbox.Label fontSize="2xs" fontFamily="mono" letterSpacing="label" color="fg.muted">
            {t('sendSettings.autoCRLF')}
          </Checkbox.Label>
        </Checkbox.Root>
      </Flex>

      <Flex gap="3" height="24">
        <Box
          flex="1"
          rounded="md"
          borderWidth="1px"
          borderColor="border"
          bg="bg"
          colorPalette="blue"
          _focusWithin={{
            borderColor: 'colorPalette.solid',
            boxShadow: '0 0 0 1px {colors.border.focus}',
          }}
        >
          <Textarea
            value={draft}
            onChange={(e) => {
              const next = e.target.value;
              setDraft(next);
              scheduleDraftSync(next);
            }}
            onBlur={() => flushDraft()}
            onKeyDown={handleKeyDown}
            placeholder={
              sendSettings.encoding === 'HEX' ? t('send.hexPlaceholder') : t('send.asciiPlaceholder')
            }
            spellCheck={false}
            height="full"
            resize="none"
            border="none"
            bg="transparent"
            p="3"
            fontFamily="mono"
            fontSize="sm"
            lineHeight="code"
            color="fg"
            _focus={{ outline: 'none', boxShadow: 'none' }}
          />
        </Box>

        <Button
          width="28"
          flexShrink={0}
          height="full"
          disabled={!canSend}
          onClick={() => doSend()}
          bg={canSend ? 'accent' : 'bg.subtle'}
          color={canSend ? 'accent.fg' : 'fg.subtle'}
          borderWidth={canSend ? '0' : '1px'}
          borderColor="border"
          _hover={canSend ? { bg: 'accent.emphasized' } : undefined}
          fontSize="sm"
          fontFamily="mono"
          fontWeight="normal"
        >
          <Flex align="center" gap="1">
            {t('send.sendBtn')}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </Flex>
        </Button>
      </Flex>

      <Flex
        align="center"
        justify="space-between"
        borderTopWidth="1px"
        borderColor="border"
        pt="2"
      >
        <Flex align="center" gap="4">
          <Checkbox.Root
            checked={sendSettings.periodicEnabled}
            onCheckedChange={(details) =>
              updateSendSettings(session.id, { periodicEnabled: details.checked === true })
            }
            colorPalette="blue"
            variant="outline"
            size="sm"
          >
            <Checkbox.HiddenInput />
            <CheckboxControl />
            <Checkbox.Label fontFamily="mono" fontSize="2xs" color="fg.subtle">
              {t('sendSettings.periodic')}
            </Checkbox.Label>
          </Checkbox.Root>
          <Flex align="center" gap="2">
            <FieldNumberInput
              value={sendSettings.periodicInterval}
              onChange={(v) =>
                updateSendSettings(session.id, { periodicInterval: v || 1000 })
              }
              min={1}
              step={100}
              disabled={!sendSettings.periodicEnabled}
              width="32"
              size="sm"
              textAlign="center"
              debounceMs={CONFIG_FIELD_DEBOUNCE_MS}
            />
            <Text fontFamily="mono" fontSize="2xs" color="fg.subtle">
              ms
            </Text>
          </Flex>
        </Flex>

        <Flex align="center" gap="2">
          <Button
            variant="ghost"
            size="xs"
            color="fg.subtle"
            onClick={() => fileInputRef.current?.click()}
          >
            {t('send.openFile')}
          </Button>
          <input ref={fileInputRef} type="file" hidden onChange={handleFileOpen} />
          <Button variant="ghost" size="xs" color="fg.subtle" onClick={() => {
            setDraft('');
            flushDraft('');
          }}>
            {t('send.clear')}
          </Button>
        </Flex>
      </Flex>

      {session.sendHistory.length > 0 && (
        <Box borderTopWidth="1px" borderColor="border" pt="2">
          <Flex align="center" justify="space-between" mb="1.5">
            <Text fontSize="2xs" color="fg.subtle">
              {t('sendSettings.sendHistory')} ({session.sendHistory.length})
            </Text>
            <Button
              variant="ghost"
              size="xs"
              color="danger"
              opacity={0.7}
              _hover={{ opacity: 1 }}
              onClick={() => {
                clearSendHistory(session.id);
                showToast('info', t('toast.historyCleared'));
              }}
            >
              {t('sendCenter.clearAll')}
            </Button>
          </Flex>
          <Flex flexWrap="wrap" gap="1.5" maxH="60px" overflowY="auto" className="sidebar-scroll">
            {session.sendHistory.map((item, i) => (
              <Flex
                key={`${item}-${i}`}
                className="group"
                align="center"
                gap="1"
                px="2"
                py="1"
                rounded="md"
                bg="bg.subtle"
                borderWidth="1px"
                borderColor="border"
                _hover={{ borderColor: 'accent.subtle' }}
              >
                <Button
                  variant="ghost"
                  size="xs"
                  height="auto"
                  minW="0"
                  fontFamily="mono"
                  fontSize="2xs"
                  color="fg.muted"
                  onClick={() => setText(item)}
                  title={item}
                >
                  <Text truncate maxW="180px">
                    {item}
                  </Text>
                </Button>
                <IconButton
                  aria-label={t('sendCenter.sendNow')}
                  title={t('sendCenter.sendNow')}
                  size="2xs"
                  variant="ghost"
                  color="accent"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={() => doSend(item)}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </IconButton>
              </Flex>
            ))}
          </Flex>
        </Box>
      )}
    </Stack>
  );
}
