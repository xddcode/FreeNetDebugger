import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Flex, Text } from '@chakra-ui/react';
import { AlertTriangle } from 'lucide-react';
import Editor from '@monaco-editor/react';
import Button from '../../common/Button';
import HttpEmptyPlaceholder from './HttpEmptyPlaceholder';
import type { ParsedHttpResponse } from './httpResponse';
import { formatResponseBodyText } from '../../../utils/http';
import { defineAppMonacoThemeSync, MONACO_BASE_EDITOR_OPTIONS } from '../../../utils/monacoTheme';
import {
  formatHttpBodySize,
  getHttpResponseBodyTier,
  resolveHttpResponseEditorLanguage,
  shouldFormatResponseBody,
} from '../../../utils/httpResponseBodyTier';

interface HttpResponseBodyPaneProps {
  displayResponse: ParsedHttpResponse;
  bodyMode: 'json' | 'html' | 'xml' | 'text';
  appTheme: 'dark' | 'light';
  onDownload: () => void;
}

function HttpResponseBodyPane({
  displayResponse,
  bodyMode,
  appTheme,
  onDownload,
}: HttpResponseBodyPaneProps) {
  const { t } = useTranslation();
  const [forcePlainText, setForcePlainText] = useState(false);

  const { fullBodyText, bodySize, bodyTruncated } = displayResponse;
  const tier = getHttpResponseBodyTier(bodySize);
  const sizeLabel = formatHttpBodySize(bodySize);

  if (!fullBodyText && !bodyTruncated && bodySize === 0) {
    return <HttpEmptyPlaceholder>{t('http.emptyBody')}</HttpEmptyPlaceholder>;
  }

  if (tier === 'blocked' && !forcePlainText) {
    return (
      <Flex
        flex="1"
        direction="column"
        align="center"
        justify="center"
        gap="6"
        px="8"
        py="10"
        minH="160px"
        textAlign="center"
      >
        <Flex
          align="center"
          justify="center"
          w="12"
          h="12"
          rounded="full"
          bg="warning.subtle"
          color="warning"
        >
          <AlertTriangle size={24} strokeWidth={2} />
        </Flex>
        <Text fontSize="sm" color="fg.muted" maxW="md" lineHeight="tall">
          {t('http.responseBodyHidden', { size: sizeLabel })}
        </Text>
        <Flex direction="column" gap="3" w="full" maxW="sm">
          <Button variant="secondary" size="md" onClick={() => setForcePlainText(true)}>
            {t('http.responseBodyForcePlainText')}
          </Button>
          <Button variant="primary" size="md" onClick={onDownload}>
            {t('http.responseBodyDownloadFull')}
          </Button>
        </Flex>
      </Flex>
    );
  }

  const useFormatting = shouldFormatResponseBody(tier, forcePlainText);
  const editorText = useFormatting
    ? formatResponseBodyText(fullBodyText, bodyMode)
    : fullBodyText;
  const lang = resolveHttpResponseEditorLanguage(tier, bodyMode, forcePlainText);
  const showDegradedBanner = tier === 'raw' || (tier === 'blocked' && forcePlainText);

  return (
    <Box flex="1" minH="0" overflow="hidden" display="flex" flexDirection="column">
      {bodyTruncated && (
        <Box
          px="4"
          py="2"
          flexShrink={0}
          bg="warning.subtle"
          borderBottomWidth="1px"
          borderColor="border"
        >
          <Text fontSize="2xs" color="warning" fontFamily="mono" lineHeight="label">
            {t('http.responseBodyBackendTruncated', { size: sizeLabel })}
          </Text>
        </Box>
      )}
      {showDegradedBanner && (
        <Box
          px="4"
          py="2"
          flexShrink={0}
          bg="warning.subtle"
          borderBottomWidth="1px"
          borderColor="border"
        >
          <Text fontSize="2xs" color="warning" fontFamily="mono" lineHeight="label">
            {tier === 'blocked' && forcePlainText
              ? t('http.responseBodyForcePlainTextWarning', { size: sizeLabel })
              : t('http.responseBodyDegradedRaw', { size: sizeLabel })}
          </Text>
        </Box>
      )}
      <Box flex="1" minH="0" overflow="hidden" className="http-editor-pane">
        <Editor
          value={editorText}
          language={lang}
          theme={`app-${appTheme}`}
          beforeMount={(monaco) => { defineAppMonacoThemeSync(monaco, appTheme); }}
          options={{
            ...MONACO_BASE_EDITOR_OPTIONS,
            readOnly: true,
            renderLineHighlight: 'none',
            folding: tier === 'full' && !forcePlainText,
          }}
        />
      </Box>
    </Box>
  );
}

export default memo(HttpResponseBodyPane);
