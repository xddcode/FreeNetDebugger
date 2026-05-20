import { useTranslation } from 'react-i18next';
import { Button, Flex, Stack } from '@chakra-ui/react';
import { useSessionStore } from '../../store';
import type { Session, EncodingMode, AsciiNonPrintableMode } from '../../types';
import { bytesToDisplay, formatTimestamp } from '../../utils/encoding';
import { PanelCard, PanelHeader, FieldSelect, CheckRow } from './ui';
import { useFileSaver, pickSaveFile, exportToFile } from '../../hooks/useFileSaver';
import { showToast } from '../../store/toastStore';

interface Props {
  session: Session;
}

export default function ReceivePanel({ session }: Props) {
  const { t } = useTranslation();
  const updateReceive = useSessionStore((s) => s.updateReceiveSettings);
  const clearLogs = useSessionStore((s) => s.clearLogs);
  const appendLog = useSessionStore((s) => s.appendLog);

  const { receiveSettings } = session;

  const { fileHandleRef, lastSavedLogIdRef } = useFileSaver(session.id);

  const handleSaveToFile = async (checked: boolean) => {
    updateReceive(session.id, { saveToFile: checked });
    if (!checked) {
      fileHandleRef.current = null;
      lastSavedLogIdRef.current = 0;
      appendLog(session.id, {
        timestamp: Date.now(),
        direction: 'system',
        data: Array.from(new TextEncoder().encode(t('receive.stoppedSaving'))),
      });
      showToast('info', t('toast.saveToFileStopped'));
      return;
    }
    const handle = await pickSaveFile(`rx_log_${Date.now()}.txt`);
    if (handle) {
      fileHandleRef.current = handle;
      lastSavedLogIdRef.current = session.logs[session.logs.length - 1]?.id ?? 0;
      appendLog(session.id, {
        timestamp: Date.now(),
        direction: 'system',
        data: Array.from(new TextEncoder().encode(t('receive.startedSaving'))),
      });
      showToast('success', t('toast.saveToFileStarted'));
    } else {
      updateReceive(session.id, { saveToFile: false });
    }
  };

  const handleExportLog = async () => {
    const asciiMode = receiveSettings.asciiNonPrintable ?? 'DOT';
    const lines = session.logs.map((e) => {
      const ts = formatTimestamp(e.timestamp);
      const dir = e.direction.toUpperCase();
      const text = bytesToDisplay(e.data, receiveSettings.encoding, asciiMode);
      return `[${ts}] ${dir}: ${text}`;
    });
    const content = lines.join('\n');
    if (!content) {
      appendLog(session.id, {
        timestamp: Date.now(),
        direction: 'system',
        data: Array.from(new TextEncoder().encode(t('receive.exportLogEmpty'))),
      });
      return;
    }

    const result = await exportToFile(content, `log_${Date.now()}.txt`);
    if (result.ok) {
      appendLog(session.id, {
        timestamp: Date.now(),
        direction: 'system',
        data: Array.from(
          new TextEncoder().encode(
            result.via === 'picker'
              ? t('receive.exportLogSaved')
              : t('receive.exportLogDownloaded'),
          ),
        ),
      });
      showToast('success', t('toast.logExported'));
    } else if (result.via === null) {
      appendLog(session.id, {
        timestamp: Date.now(),
        direction: 'system',
        data: Array.from(new TextEncoder().encode(t('receive.exportLogFailed'))),
      });
    } else {
      showToast('error', t('toast.logExportFailed'));
    }
  };

  const RECEIVE_ENCODINGS: { value: EncodingMode; label: string }[] = [
    { value: 'AUTO', label: t('receive.modeAuto') },
    { value: 'HEX', label: t('receive.modeHex') },
    { value: 'HEX_TEXT', label: t('receive.modeHexText') },
    { value: 'UTF8', label: t('receive.modeUtf8') },
    { value: 'ASCII', label: t('receive.modeAscii') },
  ];
  const ASCII_NON_PRINTABLE: { value: AsciiNonPrintableMode; label: string }[] = [
    { value: 'DOT', label: t('receive.nonPrintableDot') },
    { value: 'HEX', label: t('receive.nonPrintableHex') },
  ];

  return (
    <PanelCard>
      <PanelHeader
        icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="8 17 12 21 16 17" />
            <line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29" />
          </svg>
        }
        label={t('receive.title')}
      />
      <Stack gap="4" px="4" py="3" pt="2">
        <FieldSelect
          value={receiveSettings.encoding}
          onChange={(v) => updateReceive(session.id, { encoding: v as EncodingMode })}
          options={RECEIVE_ENCODINGS}
        />
        <FieldSelect
          value={receiveSettings.asciiNonPrintable ?? 'DOT'}
          onChange={(v) =>
            updateReceive(session.id, { asciiNonPrintable: v as AsciiNonPrintableMode })
          }
          options={ASCII_NON_PRINTABLE}
        />
        <Stack gap="2.5">
          <CheckRow
            checked={receiveSettings.autoNewline}
            onChange={(v) => updateReceive(session.id, { autoNewline: v })}
            label={t('receive.autoNewline')}
          />
          <CheckRow
            checked={receiveSettings.saveToFile}
            onChange={handleSaveToFile}
            label={t('receive.saveToFile')}
          />
          <CheckRow
            checked={receiveSettings.pauseReceiving}
            onChange={(v) => updateReceive(session.id, { pauseReceiving: v })}
            label={t('receive.pauseReceiving')}
          />
        </Stack>
        <Flex
          align="center"
          justify="space-between"
          pt="3"
          mt="1"
          borderTopWidth="1px"
          borderColor="border"
        >
          <Button
            variant="ghost"
            size="xs"
            fontSize="2xs"
            fontFamily="mono"
            fontWeight="normal"
            color="accent"
            onClick={handleExportLog}
          >
            {t('receive.exportLog')}
          </Button>
          <Button
            variant="ghost"
            size="xs"
            fontSize="2xs"
            fontFamily="mono"
            fontWeight="normal"
            color="danger"
            onClick={() => {
              clearLogs(session.id);
              showToast('info', t('toast.logsCleared'));
            }}
          >
            {t('receive.clearRx')}
          </Button>
        </Flex>
      </Stack>
    </PanelCard>
  );
}
