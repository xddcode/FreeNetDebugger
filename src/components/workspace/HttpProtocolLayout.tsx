import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Flex } from '@chakra-ui/react';
import { useSessionStore, getHttpTabConfig } from '../../store';
import {
  isValidHttpUrl,
  methodAllowsBody,
  stripUrlQuery,
  buildUrlWithPathParams,
  resolveHttpRequestUrl,
} from '../../utils/http';
import { showToast } from '../../store/toastStore';
import type { HttpSession } from '../../types';
import {
  HttpRequestEditorProvider,
} from './http/HttpRequestEditorContext';
import type { HttpRequestEditorHandle } from './http/requestEditor.shared';
import HttpUrlBar from './http/HttpUrlBar';
import HttpRequestPanel from './http/HttpRequestPanel';
import HttpResponsePanel from './http/HttpResponsePanel';
import type { ParsedHttpError, ParsedHttpResponse } from './http/httpResponse';
import { executeHttpRequest, toParsedHttpResponse } from '../../services/httpRequestService';

interface Props {
  session: HttpSession;
}

export default function HttpProtocolLayout({ session }: Props) {
  const { t } = useTranslation();
  const sessionId = session.id;

  const addSendHistory = useSessionStore((s) => s.addSendHistory);
  const addTxBytes = useSessionStore((s) => s.addTxBytes);
  const addRxBytes = useSessionStore((s) => s.addRxBytes);

  const httpMethod = useSessionStore(
    useCallback(
      (s) => getHttpTabConfig(s, sessionId)?.httpMethod ?? 'GET',
      [sessionId],
    ),
  );
  const safeBodyType = useSessionStore(
    useCallback(
      (s) => getHttpTabConfig(s, sessionId)?.httpBody?.type ?? 'none',
      [sessionId],
    ),
  );

  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<ParsedHttpResponse | null>(null);
  const [error, setError] = useState<ParsedHttpError | null>(null);
  const [configRevision, setConfigRevision] = useState(0);
  const requestEditorRef = useRef<HttpRequestEditorHandle>(null);
  const requestSeqRef = useRef(0);

  const handleSend = useCallback(async () => {
    const editor = requestEditorRef.current;
    if (!editor) {
      return;
    }

    const snap = editor.getSendSnapshot();
    if (!snap.url) {
      return;
    }
    if (!isValidHttpUrl(snap.url)) {
      showToast('error', t('http.invalidUrl'));
      return;
    }

    const requestSeq = ++requestSeqRef.current;
    setSending(true);
    setError(null);

    const bodyAllowed = methodAllowsBody(httpMethod);
    const enabledHeaders = snap.headers.filter((h) => h.enabled);
    const headerMap: Record<string, string> = {};
    for (const h of enabledHeaders) {
      if (h.key.trim()) {
        headerMap[h.key] = h.value;
      }
    }

    const enabledParams = snap.params
      .filter((p) => p.enabled && p.key.trim())
      .map((p) => ({ key: p.key.trim(), value: p.value, enabled: true }));

    const enabledPathParams = snap.pathParams
      .filter((p) => p.key.trim())
      .map((p) => ({ key: p.key.trim(), value: p.value, enabled: true }));

    const urlWithPath = buildUrlWithPathParams(stripUrlQuery(snap.urlBase), enabledPathParams);
    const resolvedUrl = resolveHttpRequestUrl(snap.urlBase, enabledPathParams, enabledParams);

    const bodyStr = bodyAllowed && safeBodyType !== 'none'
      ? snap.bodyContent.trim() || undefined
      : undefined;

    const httpPayload = {
      method: httpMethod,
      url: urlWithPath,
      headers: headerMap,
      params: enabledParams,
      body: bodyStr,
    };
    const payloadBytes = new TextEncoder().encode(JSON.stringify(httpPayload)).length;

    try {
      const dto = await executeHttpRequest(httpPayload);
      if (requestSeq !== requestSeqRef.current) {
        return;
      }
      const timestamp = Date.now();
      setResponse(toParsedHttpResponse(dto, timestamp));
      addTxBytes(sessionId, payloadBytes);
      addRxBytes(sessionId, dto.bodySize);
      addSendHistory(sessionId, `${httpMethod} ${resolvedUrl}`);
      editor.flushRequestFields();
    } catch (e) {
      if (requestSeq !== requestSeqRef.current) {
        return;
      }
      setResponse(null);
      const message = e instanceof Error ? e.message : String(e);
      setError({ message, timestamp: Date.now() });
    } finally {
      if (requestSeq === requestSeqRef.current) {
        setSending(false);
      }
    }
  }, [sessionId, httpMethod, safeBodyType, addSendHistory, addTxBytes, addRxBytes, t]);

  const handleClearResponse = useCallback(() => {
    setResponse(null);
    setError(null);
  }, []);

  return (
    <Box
      className="http-workspace"
      flex="1"
      minH="0"
      minW="0"
      display="flex"
      flexDirection="column"
      overflow="hidden"
    >
      <HttpRequestEditorProvider sessionId={sessionId} editorRef={requestEditorRef} configRevision={configRevision}>
        <HttpUrlBar
          sending={sending}
          onSend={() => void handleSend()}
          onConfigImported={() => setConfigRevision((r) => r + 1)}
        />
        <Flex flex="1" minH="0" minW="0">
          <HttpRequestPanel />
          <HttpResponsePanel
            sessionId={sessionId}
            sending={sending}
            response={response}
            error={error}
            onClear={handleClearResponse}
          />
        </Flex>
      </HttpRequestEditorProvider>
    </Box>
  );
}
