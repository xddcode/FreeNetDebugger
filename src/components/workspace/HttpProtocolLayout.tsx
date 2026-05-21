import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Flex,
  IconButton,
  Input,
  Stack,
  Text,
} from '@chakra-ui/react';
import { Copy, Download, Eraser } from 'lucide-react';
import LoadingOverlay from '../ui/LoadingOverlay';
import { FieldInput, FieldLabel, FieldSelect } from '../sidebar/ui';
import {
  HTTP_METHODS,
  buildUrlWithParams,
  methodAllowsBody,
  stripUrlQuery,
  isValidHttpUrl,
  buildHttpResponseExportText,
  formatResponseBodyText,
  suggestHttpResponseFileName,
  normalizeHttpBody,
  commitHttpBodyContent,
  switchHttpBodyType,
} from '../../utils/http';
import { exportToFile } from '../../hooks/useFileSaver';
import HttpKeyValueRow from '../ui/HttpKeyValueRow';
import PanelLineTabs from '../ui/PanelLineTabs';
import { Wand2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useSessionStore, useSettingsStore } from '../../store';
import { invoke } from '../../utils/tauri';
import { buildConnectPayload } from '../../utils/protocolConfig';
import { defineAppMonacoTheme, defineAppMonacoThemeSync, MONACO_BASE_EDITOR_OPTIONS } from '../../utils/monacoTheme';
import { useDebouncedControlledValue } from '../../hooks/useDebouncedControlledValue';
import { CONFIG_FIELD_DEBOUNCE_MS } from '../../config/constants';
import { showToast } from '../../store/toastStore';
import type { Session, HttpHeader, HttpMethod, HttpQueryParam, HttpBody } from '../../types';

/* ─── Types ─── */

type RequestTab = 'params' | 'headers' | 'body' | 'auth';
type ResponseTab = 'body' | 'headers';

interface ParsedHttpResponse {
  statusCode: number;
  statusText: string;
  elapsedMs: number;
  headers: Record<string, string>;
  bodyText: string;
  bodySize: number;
  contentType: string;
}

/* ─── Helpers ─── */

function parseHttpResponseAt(logs: Session['logs'], systemIndex: number): ParsedHttpResponse | null {
  const entry = logs[systemIndex];
  if (entry.direction !== 'system') {
    return null;
  }
  const text = new TextDecoder().decode(new Uint8Array(entry.data));
  const match = text.match(/^HTTP\s+(\d{3})\s+(.+)\s*\((\d+)\s*ms\)\n/);
  if (!match) {
    return null;
  }
  const statusCode = parseInt(match[1], 10);
  const statusText = match[2].trim();
  const elapsedMs = parseInt(match[3], 10);

  const afterStatus = text.slice(match[0].length);
  const headers: Record<string, string> = {};
  let contentType = '';
  for (const line of afterStatus.split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim().toLowerCase();
      const value = line.slice(idx + 1).trim();
      headers[key] = value;
      if (key === 'content-type') {
        contentType = value;
      }
    }
  }

  let bodyText = '';
  for (let j = systemIndex + 1; j < logs.length; j++) {
    if (logs[j].direction === 'recv') {
      bodyText = new TextDecoder().decode(new Uint8Array(logs[j].data));
      break;
    }
  }

  return { statusCode, statusText, elapsedMs, headers, bodyText, bodySize: bodyText.length, contentType };
}

function parseHttpResponse(logs: Session['logs']): ParsedHttpResponse | null {
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].direction !== 'system') {
      continue;
    }
    const parsed = parseHttpResponseAt(logs, i);
    if (parsed) {
      return parsed;
    }
  }
  return null;
}

function findHttpResponseAfter(logs: Session['logs'], since: number): ParsedHttpResponse | null {
  for (let i = logs.length - 1; i >= 0; i--) {
    const entry = logs[i];
    if (entry.timestamp < since) {
      break;
    }
    if (entry.direction !== 'system') {
      continue;
    }
    const parsed = parseHttpResponseAt(logs, i);
    if (parsed) {
      return parsed;
    }
  }
  return null;
}

function statusPalette(code: number): string {
  if (code >= 200 && code < 300) {
    return 'success';
  }
  if (code >= 300 && code < 500) {
    return 'warning';
  }
  if (code >= 500) {
    return 'danger';
  }
  return 'fg.muted';
}

/** Shared height/padding for request & response column toolbars */
const HTTP_PANEL_TOOLBAR_PROPS = {
  align: 'center' as const,
  minH: '10',
  py: '2',
  px: '4',
  flexShrink: 0,
  borderBottomWidth: '1px',
  borderColor: 'border',
};

function EmptyPlaceholder({ children }: { children: ReactNode }) {
  return (
    <Flex flex="1" align="center" justify="center" minH="160px" p="6" bg="bg.panel">
      <Text
        fontSize="2xs"
        color="fg.subtle"
        fontFamily="mono"
        lineHeight="label"
        letterSpacing="label"
        textAlign="center"
        maxW="240px"
      >
        {children}
      </Text>
    </Flex>
  );
}

function detectBodyMode(contentType: string): 'json' | 'html' | 'xml' | 'text' {
  const ct = contentType.toLowerCase();
  if (ct.includes('application/json')) {
    return 'json';
  }
  if (ct.includes('text/html')) {
    return 'html';
  }
  if (ct.includes('application/xml') || ct.includes('text/xml')) {
    return 'xml';
  }
  return 'text';
}

const COMMON_HTTP_HEADERS = [
  'Accept', 'Accept-Charset', 'Accept-Encoding', 'Accept-Language',
  'Authorization', 'Cache-Control', 'Connection', 'Content-Length',
  'Content-Type', 'Cookie', 'Host', 'If-Match', 'If-Modified-Since',
  'If-None-Match', 'Origin', 'Referer', 'User-Agent', 'X-Requested-With',
];

/* ─── Header key autocomplete ─── */

interface HeaderKeyAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function HeaderKeyAutocomplete({ value, onChange, placeholder, className }: HeaderKeyAutocompleteProps) {
  const [focused, setFocused] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const matches = useMemo(() => {
    if (!value.trim()) {
      return [];
    }
    const lower = value.toLowerCase();
    return COMMON_HTTP_HEADERS.filter(
      h => h.toLowerCase().startsWith(lower) && h.toLowerCase() !== lower
    ).slice(0, 6);
  }, [value]);

  const open = focused && matches.length > 0;

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || matches.length === 0) {
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(i => (i + 1) % matches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(i => (i - 1 + matches.length) % matches.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onChange(matches[highlighted]);
      setFocused(false);
    } else if (e.key === 'Escape') {
      setFocused(false);
    }
  };

  return (
    <Box position="relative" flex="1" minW="0">
      <Input
        size="xs"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setHighlighted(0);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 150)}
        placeholder={placeholder}
        fontFamily="mono"
        fontSize="2xs"
        className={className}
      />
      {open && matches.length > 0 && (
        <Box
          position="absolute"
          top="100%"
          left="0"
          right="0"
          mt="0.5"
          bg="bg.panel"
          borderWidth="1px"
          borderColor="border"
          rounded="md"
          shadow="lg"
          zIndex="50"
          maxH="48"
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
                onChange(m);
                setFocused(false);
              }}
            >
              {m}
            </Button>
          ))}
        </Box>
      )}
    </Box>
  );
}

/* ─── Component ─── */

interface Props {
  session: Session;
}

export default function HttpProtocolLayout({ session }: Props) {
  const { t } = useTranslation();
  const updateConfig = useSessionStore(s => s.updateConfig);
  const appendLog = useSessionStore(s => s.appendLog);
  const clearHttpResponses = useSessionStore(s => s.clearHttpResponses);
  const addSendHistory = useSessionStore(s => s.addSendHistory);
  const addTxBytes = useSessionStore(s => s.addTxBytes);
  const appTheme = useSettingsStore(s => s.theme);

  const [reqTab, setReqTab] = useState<RequestTab>('body');
  const [resTab, setResTab] = useState<ResponseTab>('body');
  const [sending, setSending] = useState(false);
  const [pinnedResponse, setPinnedResponse] = useState<ParsedHttpResponse | null>(null);
  const sendStartedAtRef = useRef(0);

  const { config } = session;
  const bodyAllowed = methodAllowsBody(config.httpMethod);

  const safeBody = useMemo(() => normalizeHttpBody(config.httpBody), [config.httpBody]);

  const {
    draft: bodyDraft,
    setDraft: setBodyDraft,
  } = useDebouncedControlledValue(safeBody.content, (next) => {
    updateConfig(session.id, { httpBody: commitHttpBodyContent(safeBody, next) });
  }, CONFIG_FIELD_DEBOUNCE_MS);

  const httpHeaders = useMemo(() => config.httpHeaders ?? [], [config.httpHeaders]);
  const httpParams = useMemo(() => config.httpParams ?? [], [config.httpParams]);

  /* ─── Monaco Editor ref for format action ─── */
  const bodyEditorRef = useRef<Parameters<NonNullable<ComponentProps<typeof Editor>['onMount']>>[0] | null>(null);

  const handleFormatJson = () => {
    const editor = bodyEditorRef.current;
    if (editor) {
      editor.getAction('editor.action.formatDocument')?.run();
    }
  };

  /* ─── Sync Monaco Editor theme with app theme ─── */
  useEffect(() => {
    void defineAppMonacoTheme(appTheme);
  }, [appTheme]);

  /* ─── Auto-ensure trailing empty row on mount / session change ─── */
  useEffect(() => {
    const lastP = httpParams[httpParams.length - 1];
    if (!lastP || lastP.key.trim() !== '') {
      updateConfig(session.id, { httpParams: [...httpParams, { key: '', value: '', enabled: true }] });
    }
    const lastH = httpHeaders[httpHeaders.length - 1];
    if (!lastH || lastH.key.trim() !== '') {
      updateConfig(session.id, { httpHeaders: [...httpHeaders, { key: '', value: '', enabled: true }] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  const latestResponse = useMemo(() => parseHttpResponse(session.logs), [session.logs]);

  const newResponse = useMemo(() => {
    if (!sending) {
      return null;
    }
    return findHttpResponseAfter(session.logs, sendStartedAtRef.current);
  }, [session.logs, sending]);

  const visibleResponse = newResponse ?? latestResponse;
  const showLoadingOverlay = sending && !newResponse;
  const displayResponse = showLoadingOverlay && pinnedResponse ? pinnedResponse : visibleResponse;
  const bodyMode = displayResponse ? detectBodyMode(displayResponse.contentType) : 'text';

  const loadingLabel = t('http.loading');

  useLayoutEffect(() => {
    if (!sending) {
      setPinnedResponse(null);
      return;
    }
    if (findHttpResponseAfter(session.logs, sendStartedAtRef.current)) {
      setSending(false);
      setPinnedResponse(null);
      return;
    }
    if (session.status === 'error') {
      setSending(false);
      setPinnedResponse(null);
    }
  }, [session.logs, session.status, sending]);

  /* ─── Header helpers (Bruno-style: trailing empty row) ─── */

  const updateHeader = (index: number, field: keyof HttpHeader, value: string | boolean) => {
    let next = httpHeaders.map((h, i) => (i === index ? { ...h, [field]: value } : h));
    // Auto-append empty row when typing in the last row's key field
    if (index === httpHeaders.length - 1 && field === 'key' && (value as string).trim() !== '') {
      next = [...next, { key: '', value: '', enabled: true }];
    }
    updateConfig(session.id, { httpHeaders: next });
  };

  const removeHeader = (index: number) => {
    let next = httpHeaders.filter((_, i) => i !== index);
    // Ensure trailing empty row remains
    const last = next[next.length - 1];
    if (!last || last.key.trim() !== '') {
      next = [...next, { key: '', value: '', enabled: true }];
    }
    updateConfig(session.id, { httpHeaders: next });
  };

  /* ─── Param helpers (Bruno-style: trailing empty row) ─── */

  const updateParam = (index: number, field: keyof HttpQueryParam, value: string | boolean) => {
    let next = httpParams.map((p, i) => (i === index ? { ...p, [field]: value } : p));
    // Auto-append empty row when typing in the last row's key field
    if (index === httpParams.length - 1 && field === 'key' && (value as string).trim() !== '') {
      next = [...next, { key: '', value: '', enabled: true }];
    }
    updateConfig(session.id, { httpParams: next });
    updateConfig(session.id, { httpUrl: buildUrlWithParams(config.httpUrl, next) });
  };

  const removeParam = (index: number) => {
    let next = httpParams.filter((_, i) => i !== index);
    // Ensure trailing empty row remains
    const last = next[next.length - 1];
    if (!last || last.key.trim() !== '') {
      next = [...next, { key: '', value: '', enabled: true }];
    }
    updateConfig(session.id, { httpParams: next });
    updateConfig(session.id, { httpUrl: buildUrlWithParams(config.httpUrl, next) });
  };

  /* ─── Auth helpers (Basic Auth auto-adds Authorization header) ─── */

  const authHeaderIndex = useMemo(() => {
    return httpHeaders.findIndex(h => h.key.toLowerCase() === 'authorization');
  }, [httpHeaders]);

  const authHeader = authHeaderIndex >= 0 ? httpHeaders[authHeaderIndex] : null;
  const authValue = authHeader?.value ?? '';
  const hasBasicAuth = authValue.toLowerCase().startsWith('basic ');
  const [authUser, authPass] = useMemo(() => {
    if (!hasBasicAuth) {
      return ['', ''];
    }
    try {
      const decoded = atob(authValue.slice(6));
      const idx = decoded.indexOf(':');
      return idx >= 0 ? [decoded.slice(0, idx), decoded.slice(idx + 1)] : [decoded, ''];
    } catch {
      return ['', ''];
    }
  }, [authValue, hasBasicAuth]);

  const setBasicAuth = (user: string, pass: string) => {
    const next = [...httpHeaders];
    if (user || pass) {
      const value = `Basic ${btoa(`${user}:${pass}`)}`;
      if (authHeaderIndex >= 0) {
        next[authHeaderIndex] = { ...next[authHeaderIndex], key: 'Authorization', value };
      } else {
        next.push({ key: 'Authorization', value, enabled: true });
      }
    } else if (authHeaderIndex >= 0) {
      next.splice(authHeaderIndex, 1);
    }
    updateConfig(session.id, { httpHeaders: next });
  };

  /* ─── Auth debounced drafts ─── */
  const [authUserDraft, setAuthUserDraft] = useState(authUser);
  const [authPassDraft, setAuthPassDraft] = useState(authPass);
  const setBasicAuthRef = useRef(setBasicAuth);
  useEffect(() => { setBasicAuthRef.current = setBasicAuth; }, [setBasicAuth]);
  const authTimerRef = useRef<number | null>(null);

  useEffect(() => { setAuthUserDraft(authUser); }, [authUser]);
  useEffect(() => { setAuthPassDraft(authPass); }, [authPass]);

  const queueAuthCommit = useCallback((user: string, pass: string) => {
    if (authTimerRef.current !== null) {
      window.clearTimeout(authTimerRef.current);
    }
    authTimerRef.current = window.setTimeout(() => {
      authTimerRef.current = null;
      setBasicAuthRef.current(user, pass);
    }, CONFIG_FIELD_DEBOUNCE_MS);
  }, []);

  /* ─── Content-Type header management ─── */

  const setBodyType = (type: HttpBody['type']) => {
    let nextHeaders = [...httpHeaders];
    const ctIndex = nextHeaders.findIndex(h => h.key.toLowerCase() === 'content-type');

    if (type === 'none') {
      if (ctIndex >= 0) {
        nextHeaders = nextHeaders.filter((_, i) => i !== ctIndex);
      }
      updateConfig(session.id, {
        httpBody: switchHttpBodyType(safeBody, 'none', bodyDraft),
        httpHeaders: nextHeaders,
      });
      return;
    }

    const ctValue = type === 'json' ? 'application/json' : 'text/plain';
    if (ctIndex >= 0) {
      nextHeaders[ctIndex] = { ...nextHeaders[ctIndex], value: ctValue };
    } else {
      nextHeaders.push({ key: 'Content-Type', value: ctValue, enabled: true });
    }

    updateConfig(session.id, {
      httpBody: switchHttpBodyType(safeBody, type, bodyDraft),
      httpHeaders: nextHeaders,
    });
  };

  const handleMethodChange = (method: HttpMethod) => {
    updateConfig(session.id, { httpMethod: method });
    if (!methodAllowsBody(method) && safeBody.type !== 'none') {
      setBodyType('none');
    }
  };

  /* ─── Send ─── */

  const handleSend = useCallback(async () => {
    if (!config.httpUrl) {
      return;
    }
    if (!isValidHttpUrl(config.httpUrl)) {
      showToast('error', t('http.invalidUrl'));
      return;
    }
    sendStartedAtRef.current = Date.now();
    setPinnedResponse(parseHttpResponse(session.logs));
    setSending(true);

    const enabledHeaders = httpHeaders.filter(h => h.enabled);
    const headerMap: Record<string, string> = {};
    for (const h of enabledHeaders) {
      if (h.key.trim()) {
        headerMap[h.key] = h.value;
      }
    }

    const enabledParams = httpParams
      .filter(p => p.enabled && p.key.trim())
      .map(p => ({ key: p.key.trim(), value: p.value, enabled: true }));

    const bodyStr = bodyAllowed && safeBody.type !== 'none'
      ? safeBody.content.trim() || undefined
      : undefined;
    const httpPayload = {
      method: config.httpMethod,
      url: stripUrlQuery(config.httpUrl),
      headers: headerMap,
      params: enabledParams,
      body: bodyStr,
    };
    const jsonBytes = Array.from(new TextEncoder().encode(JSON.stringify(httpPayload)));

    try {
      // Stateless protocols like HTTP pass config so the backend can auto-spawn the handler
      await invoke('send_data', { id: session.id, data: jsonBytes, config: buildConnectPayload(config) });
      appendLog(session.id, { timestamp: Date.now(), direction: 'send', data: jsonBytes });
      addTxBytes(session.id, jsonBytes.length);
      addSendHistory(session.id, `${config.httpMethod} ${config.httpUrl}`);
    } catch (e) {
      appendLog(session.id, {
        timestamp: Date.now(),
        direction: 'system',
        data: Array.from(new TextEncoder().encode(`HTTP ${t('send.sendFailed')}: ${e}`)),
      });
      showToast('error', `${t('toast.sendFailed')}: ${e}`);
      setSending(false);
    }
  }, [session.id, config, httpHeaders, httpParams, safeBody, bodyAllowed, appendLog, addSendHistory, addTxBytes, t]);

  const canUseResponseActions = !!displayResponse && !showLoadingOverlay;

  const handleCopyResponse = () => {
    if (!displayResponse?.bodyText) {
      return;
    }
    const body = formatResponseBodyText(displayResponse.bodyText, bodyMode);
    void window.navigator.clipboard
      .writeText(body)
      .then(() => showToast('success', t('toast.copiedToClipboard')));
  };

  const handleDownloadResponse = async () => {
    if (!displayResponse) {
      return;
    }
    const formatted = {
      ...displayResponse,
      bodyText: formatResponseBodyText(displayResponse.bodyText, bodyMode),
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
  };

  const handleClearResponse = () => {
    clearHttpResponses(session.id);
    setPinnedResponse(null);
  };

  /* ─── Tab configs ─── */

  const reqTabs: { key: RequestTab; label: string; count?: number }[] = [
    { key: 'params', label: t('http.queryParams'), count: httpParams.filter(p => p.enabled && p.key).length },
    { key: 'headers', label: t('http.headers'), count: httpHeaders.filter(h => h.enabled && h.key).length },
    { key: 'body', label: t('http.body') },
    { key: 'auth', label: t('http.basicAuth') },
  ];

  /* ─── Render helpers ─── */

  const renderResponseBody = () => {
    if (!displayResponse && !sending) {
      return <EmptyPlaceholder>{t('http.sendHint')}</EmptyPlaceholder>;
    }

    const rawText = displayResponse?.bodyText ?? '';
    const text = formatResponseBodyText(rawText, bodyMode);
    const lang = bodyMode === 'json' ? 'json' : bodyMode === 'html' ? 'html' : bodyMode === 'xml' ? 'xml' : 'plaintext';

    const bodyContent = !rawText ? (
      <EmptyPlaceholder>{t('http.emptyBody')}</EmptyPlaceholder>
    ) : (
      <Box flex="1" minH="0" overflow="hidden" className="http-editor-pane">
        <Editor
          value={text}
          language={lang}
          theme={`app-${appTheme}`}
          beforeMount={monaco => { defineAppMonacoThemeSync(monaco, appTheme); }}
          options={{
            ...MONACO_BASE_EDITOR_OPTIONS,
            readOnly: true,
            renderLineHighlight: 'none',
          }}
        />
      </Box>
    );

    return !displayResponse && sending ? null : bodyContent;
  };

  const renderResponseHeaders = () => {
    if (!displayResponse && !sending) {
      return <EmptyPlaceholder>{t('http.noResponse')}</EmptyPlaceholder>;
    }

    const entries = displayResponse ? Object.entries(displayResponse.headers) : [];
    const headersContent = entries.length === 0 ? (
      <EmptyPlaceholder>{t('http.emptyHeaders')}</EmptyPlaceholder>
    ) : (
      <Stack gap="0" p="4" overflowY="auto" className="sidebar-scroll" flex="1" minH="0">
        {entries.map(([key, value]) => (
          <Flex
            key={key}
            gap="3"
            py="1.5"
            borderBottomWidth="1px"
            borderColor="border"
            fontFamily="mono"
            fontSize="2xs"
            _last={{ borderBottomWidth: 0 }}
          >
            <Text color="accent" flexShrink={0} minW="0">
              {key}
            </Text>
            <Text color="fg.muted" wordBreak="break-all" flex="1">
              {value}
            </Text>
          </Flex>
        ))}
      </Stack>
    );

    return headersContent;
  };

  const responseLoading = sending && (!displayResponse || showLoadingOverlay);

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
      {/* ─── URL bar ─── */}
      <Flex
        align="center"
        gap="3"
        px="4"
        py="3"
        flexShrink={0}
        borderBottomWidth="1px"
        borderColor="border"
      >
        <FieldSelect
          value={config.httpMethod}
          onChange={(v) => handleMethodChange(v as HttpMethod)}
          options={HTTP_METHODS.map((m) => ({ value: m, label: m }))}
          width="110px"
          minWidth="110px"
          fontSize="xs"
        />
        <Box flex="1" minW="0">
          <FieldInput
            debounceMs={CONFIG_FIELD_DEBOUNCE_MS}
            value={config.httpUrl}
            onChange={(v) => updateConfig(session.id, { httpUrl: v })}
            placeholder="https://api.example.com"
          />
        </Box>
        <Button
          flexShrink={0}
          size="md"
          onClick={handleSend}
          disabled={sending || !config.httpUrl}
          bg="accent"
          color="accent.fg"
          _hover={{ bg: 'accent.emphasized' }}
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

      {/* ─── Request | Response ─── */}
      <Flex flex="1" minH="0" minW="0">
        <Box
          flex="1"
          display="flex"
          flexDirection="column"
          minH="0"
          minW="0"
          borderRightWidth="1px"
          borderColor="border"
          overflow="hidden"
        >
          <Flex {...HTTP_PANEL_TOOLBAR_PROPS}>
            <PanelLineTabs
              embedded
              tabs={reqTabs.map((tab) => ({ key: tab.key, label: tab.label, count: tab.count }))}
              value={reqTab}
              onChange={(key) => setReqTab(key as RequestTab)}
            />
          </Flex>

          <Box
            flex="1"
            minH="0"
            overflowY={reqTab === 'body' ? 'hidden' : 'auto'}
            overflowX="hidden"
            p={reqTab === 'body' ? '0' : '4'}
            display="flex"
            flexDirection="column"
            bg="bg.panel"
            className="sidebar-scroll"
          >
            {reqTab === 'params' && (
              <Stack gap="1.5">
                {httpParams.map((p, i) => (
                  <HttpKeyValueRow
                    key={i}
                    enabled={p.enabled}
                    keyValue={p.key}
                    value={p.value}
                    onEnabledChange={(v) => updateParam(i, 'enabled', v)}
                    onKeyChange={(v) => updateParam(i, 'key', v)}
                    onValueChange={(v) => updateParam(i, 'value', v)}
                    onRemove={() => removeParam(i)}
                  />
                ))}
              </Stack>
            )}

            {reqTab === 'headers' && (
              <Stack gap="1.5">
                {httpHeaders.map((h, i) => (
                  <HttpKeyValueRow
                    key={i}
                    enabled={h.enabled}
                    keyValue={h.key}
                    value={h.value}
                    onEnabledChange={(v) => updateHeader(i, 'enabled', v)}
                    onKeyChange={(v) => updateHeader(i, 'key', v)}
                    onValueChange={(v) => updateHeader(i, 'value', v)}
                    onRemove={() => removeHeader(i)}
                    keyField={
                      <HeaderKeyAutocomplete
                        value={h.key}
                        onChange={(v) => updateHeader(i, 'key', v)}
                        placeholder="Header"
                      />
                    }
                  />
                ))}
              </Stack>
            )}

            {reqTab === 'body' && (
              <Stack gap="0" flex="1" minH="0" h="full">
                <Flex align="center" gap="2" px="4" py="2" flexShrink={0} borderBottomWidth="1px" borderColor="border">
                  <FieldSelect
                    value={safeBody.type}
                    onChange={(v) => setBodyType(v as HttpBody['type'])}
                    options={[
                      { value: 'none', label: t('http.bodyTypeNone') },
                      { value: 'text', label: t('http.bodyTypeText') },
                      { value: 'json', label: t('http.bodyTypeJson') },
                    ]}
                    width="72px"
                    minWidth="72px"
                    fontSize="2xs"
                    disabled={!bodyAllowed}
                  />
                  {safeBody.type === 'json' && bodyAllowed && (
                    <Button
                      onClick={handleFormatJson}
                      title={t('http.formatJson')}
                      size="xs"
                      variant="outline"
                      colorPalette="blue"
                      fontSize="2xs"
                      fontFamily="mono"
                    >
                      <Wand2 size={12} />
                      {t('http.formatJson')}
                    </Button>
                  )}
                </Flex>

                {safeBody.type === 'none' || !bodyAllowed ? (
                  <EmptyPlaceholder>{t('http.noBody')}</EmptyPlaceholder>
                ) : (
                  <Box flex="1" minH="0" overflow="hidden" className="http-editor-pane">
                    <Editor
                      value={bodyDraft}
                      onChange={v => setBodyDraft(v ?? '')}
                      onMount={editor => { bodyEditorRef.current = editor; }}
                      beforeMount={monaco => { defineAppMonacoThemeSync(monaco, appTheme); }}
                      language={safeBody.type === 'json' ? 'json' : 'plaintext'}
                      theme={`app-${appTheme}`}
                      options={{
                        ...MONACO_BASE_EDITOR_OPTIONS,
                        renderLineHighlight: 'none',
                      }}
                    />
                  </Box>
                )}
              </Stack>
            )}

            {reqTab === 'auth' && (
              <Stack gap="4" maxW="360px">
                <Box>
                  <FieldLabel label={t('http.username')} />
                  <Input
                    size="sm"
                    width="full"
                    colorPalette="blue"
                    value={authUserDraft}
                    onChange={(e) => {
                      const next = e.target.value;
                      setAuthUserDraft(next);
                      queueAuthCommit(next, authPassDraft);
                    }}
                    placeholder="username"
                    _placeholder={{ color: 'fg.subtle' }}
                  />
                </Box>
                <Box>
                  <FieldLabel label={t('http.password')} />
                  <Input
                    size="sm"
                    width="full"
                    type="password"
                    colorPalette="blue"
                    value={authPassDraft}
                    onChange={(e) => {
                      const next = e.target.value;
                      setAuthPassDraft(next);
                      queueAuthCommit(authUserDraft, next);
                    }}
                    placeholder="password"
                    _placeholder={{ color: 'fg.subtle' }}
                  />
                </Box>
                {hasBasicAuth && (
                  <Text fontSize="2xs" color="success" fontFamily="mono" lineHeight="label" letterSpacing="label">
                    {t('http.authHint')}
                  </Text>
                )}
              </Stack>
            )}
          </Box>
        </Box>

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
              className={showLoadingOverlay ? 'http-response-stale-dim' : undefined}
            >
              {!displayResponse ? (
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
                    {displayResponse.bodySize > 0 ? `${(displayResponse.bodySize / 1024).toFixed(1)} KB` : '—'}
                  </Text>
                  <Text fontSize="2xs" color="fg.subtle" textTransform="uppercase" whiteSpace="nowrap">
                    {bodyMode}
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
                    disabled={!displayResponse?.bodyText}
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
                    onClick={handleClearResponse}
                  >
                    <Eraser size={15} strokeWidth={2} />
                  </IconButton>
                </Flex>
              )}
            </Flex>
          </Flex>

          <LoadingOverlay loading={responseLoading} label={loadingLabel}>
            <Box flex="1" minH="0" overflow="hidden" display="flex" flexDirection="column" bg="bg.panel">
              {resTab === 'body' ? renderResponseBody() : renderResponseHeaders()}
            </Box>
          </LoadingOverlay>
        </Box>
      </Flex>
    </Box>
  );
}
