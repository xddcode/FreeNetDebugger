import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Flex,
  IconButton,
  Text,
} from '@chakra-ui/react';
import { Copy, Download, Eraser } from 'lucide-react';
import LoadingOverlay from '../../ui/LoadingOverlay';
import ReadonlyKeyValueTable from '../../ui/ReadonlyKeyValueTable';
import PanelLineTabs from '../../ui/PanelLineTabs';
import { useSettingsStore } from '../../../store';
import { exportToFile } from '../../../hooks/useFileSaver';
import {
  buildHttpResponseExportText,
  formatResponseBodyText,
  suggestHttpResponseFileName,
} from '../../../utils/http';
import {
  formatHttpBodySize,
  getHttpResponseBodyTier,
  shouldFormatResponseBody,
} from '../../../utils/httpResponseBodyTier';
import { showToast } from '../../../store/toastStore';
import {
  detectBodyMode,
  HTTP_PANEL_TOOLBAR_PROPS,
  statusPalette,
  type ParsedHttpError,
  type ParsedHttpResponse,
} from './httpResponse';
import HttpEmptyPlaceholder from './HttpEmptyPlaceholder';
import HttpResponseBodyPane from './HttpResponseBodyPane';

type ResponseTab = 'body' | 'headers';

interface HttpResponsePanelProps {
  sessionId: string;
  sending: boolean;
  response: ParsedHttpResponse | null;
  error: ParsedHttpError | null;
  onClear: () => void;
}

function HttpResponsePanel({
  sessionId: _sessionId,
  sending,
  response,
  error,
  onClear,
}: HttpResponsePanelProps) {
  const { t } = useTranslation();
  const appTheme = useSettingsStore((s) => s.theme);

  const [resTab, setResTab] = useState<ResponseTab>('body');

  const requestInFlight = sending;
  const activeError = !sending ? error : null;
  const displayResponse = !sending && !activeError ? response : null;

  const bodyMode = displayResponse ? detectBodyMode(displayResponse.contentType) : 'text';
  const bodyTier = displayResponse ? getHttpResponseBodyTier(displayResponse.bodySize) : 'full';
  const loadingLabel = t('http.loading');
  const canUseResponseActions = !!displayResponse && !requestInFlight && !activeError;

  const toolbarModeLabel = useMemo(() => {
    if (!displayResponse) {
      return bodyMode;
    }
    const tier = getHttpResponseBodyTier(displayResponse.bodySize);
    if (tier === 'blocked') {
      return t('http.responseBodyModeHidden');
    }
    if (tier === 'raw') {
      return t('http.responseBodyModeRaw');
    }
    return bodyMode;
  }, [displayResponse, bodyMode, t]);

  const handleCopyResponse = useCallback(() => {
    if (!displayResponse?.fullBodyText) {
      return;
    }
    const useFormatting = shouldFormatResponseBody(bodyTier, false);
    const body = useFormatting
      ? formatResponseBodyText(displayResponse.fullBodyText, bodyMode)
      : displayResponse.fullBodyText;
    void window.navigator.clipboard
      .writeText(body)
      .then(() => showToast('success', t('toast.copiedToClipboard')));
  }, [displayResponse, bodyMode, bodyTier, t]);

  const handleDownloadResponse = useCallback(async () => {
    if (!displayResponse) {
      return;
    }
    const useFormatting = shouldFormatResponseBody(bodyTier, false);
    const formatted = {
      ...displayResponse,
      bodyText: useFormatting
        ? formatResponseBodyText(displayResponse.fullBodyText, bodyMode)
        : displayResponse.fullBodyText,
    };
    const content = buildHttpResponseExportText(formatted);
    const fileName = suggestHttpResponseFileName(
      displayResponse.statusCode,
      displayResponse.contentType,
    );
    const result = await exportToFile(content, fileName);
    if (result.ok) {
      showToast('success', t('http.responseExported'));
    }
  }, [displayResponse, bodyMode, bodyTier, t]);

  const renderError = () => (
    <Flex flex="1" direction="column" gap="3" p="6" minH="160px">
      <Text fontSize="sm" fontWeight="bold" color="danger" fontFamily="mono">
        {t('http.requestFailed')}
      </Text>
      <Box
        px="3"
        py="3"
        rounded="md"
        bg="danger.subtle"
        borderWidth="1px"
        borderColor="danger.subtle"
      >
        <Text fontSize="xs" color="fg" fontFamily="mono" whiteSpace="pre-wrap" wordBreak="break-word">
          {activeError?.message}
        </Text>
      </Box>
    </Flex>
  );

  const renderResponseBody = () => {
    if (activeError) {
      return renderError();
    }

    if (requestInFlight) {
      return null;
    }

    if (!displayResponse) {
      return <HttpEmptyPlaceholder>{t('http.sendHint')}</HttpEmptyPlaceholder>;
    }

    return (
      <HttpResponseBodyPane
        key={displayResponse.timestamp}
        displayResponse={displayResponse}
        bodyMode={bodyMode}
        appTheme={appTheme}
        onDownload={() => void handleDownloadResponse()}
      />
    );
  };

  const renderResponseHeaders = () => {
    if (activeError) {
      return renderError();
    }

    if (requestInFlight) {
      return null;
    }

    if (!displayResponse) {
      return <HttpEmptyPlaceholder>{t('http.noResponse')}</HttpEmptyPlaceholder>;
    }

    const entries = Object.entries(displayResponse.headers).map(([key, value]) => ({ key, value }));

    if (entries.length === 0) {
      return <HttpEmptyPlaceholder>{t('http.emptyHeaders')}</HttpEmptyPlaceholder>;
    }

    return (
      <Box px="4" py="3" width="full">
        <ReadonlyKeyValueTable
          items={entries}
          keyHeader={t('http.headerName')}
          valueHeader={t('http.headerValue')}
        />
      </Box>
    );
  };

  return (
    <Box flex="1" display="flex" flexDirection="column" minH="0" minW="0" overflow="hidden">
      <Flex
        {...HTTP_PANEL_TOOLBAR_PROPS}
        justify="space-between"
        gap="3"
        fontFamily="mono"
      >
        <PanelLineTabs
          embedded
          tabs={[
            { key: 'body', label: t('http.responseBody') },
            { key: 'headers', label: t('http.responseHeaders') },
          ]}
          value={resTab}
          onChange={(key) => setResTab(key as ResponseTab)}
        />

        <Flex
          align="center"
          gap="3"
          flexShrink={0}
          justify="flex-end"
        >
          {activeError ? (
            <Text fontSize="sm" fontWeight="bold" color="danger" whiteSpace="nowrap">
              {t('http.requestFailed')}
            </Text>
          ) : requestInFlight ? (
            <Text fontSize="2xs" color="fg.muted" lineHeight="label" letterSpacing="label" whiteSpace="nowrap">
              {loadingLabel}
            </Text>
          ) : !displayResponse ? (
            <Text fontSize="2xs" color="fg.subtle" lineHeight="label" letterSpacing="label" whiteSpace="nowrap">
              {t('http.noResponse')}
            </Text>
          ) : (
            <>
              <Text fontSize="sm" fontWeight="bold" color={statusPalette(displayResponse.statusCode)} whiteSpace="nowrap">
                {displayResponse.statusCode}
              </Text>
              <Text fontSize="2xs" color="fg.muted" whiteSpace="nowrap">
                {displayResponse.statusText}
              </Text>
              <Text fontSize="2xs" color="fg.subtle" whiteSpace="nowrap">
                {displayResponse.elapsedMs}ms
              </Text>
              <Text fontSize="2xs" color="fg.subtle" whiteSpace="nowrap">
                {displayResponse.bodySize > 0 ? formatHttpBodySize(displayResponse.bodySize) : '—'}
              </Text>
              <Text fontSize="2xs" color="fg.subtle" textTransform="uppercase" whiteSpace="nowrap">
                {toolbarModeLabel}
              </Text>
            </>
          )}

          {canUseResponseActions && (
            <Flex gap="0.5" flexShrink={0} ml="1">
              <IconButton
                aria-label={t('http.copyResponse')}
                title={t('http.copyResponse')}
                size="xs"
                variant="ghost"
                colorPalette="blue"
                disabled={!displayResponse?.fullBodyText}
                onClick={handleCopyResponse}
              >
                <Copy size={15} strokeWidth={2} />
              </IconButton>
              <IconButton
                aria-label={t('http.downloadResponse')}
                title={t('http.downloadResponse')}
                size="xs"
                variant="ghost"
                colorPalette="blue"
                onClick={() => void handleDownloadResponse()}
              >
                <Download size={15} strokeWidth={2} />
              </IconButton>
              <IconButton
                aria-label={t('http.clearResponse')}
                title={t('http.clearResponse')}
                size="xs"
                variant="ghost"
                colorPalette="blue"
                onClick={onClear}
              >
                <Eraser size={15} strokeWidth={2} />
              </IconButton>
            </Flex>
          )}
        </Flex>
      </Flex>

      <LoadingOverlay loading={requestInFlight} label={loadingLabel} dimContent={false}>
        <Box
          flex="1"
          minH="0"
          overflow={resTab === 'headers' ? 'auto' : 'hidden'}
          display="flex"
          flexDirection="column"
          bg="bg.panel"
          className={resTab === 'headers' ? 'sidebar-scroll' : undefined}
        >
          {resTab === 'body' ? renderResponseBody() : renderResponseHeaders()}
        </Box>
      </LoadingOverlay>
    </Box>
  );
}

export default memo(HttpResponsePanel, (prev, next) =>
  prev.sessionId === next.sessionId
  && prev.sending === next.sending
  && prev.response === next.response
  && prev.error === next.error,
);
