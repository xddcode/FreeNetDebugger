import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  type ComponentProps,
  type KeyboardEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Flex,
  Input,
  Stack,
  Text,
} from '@chakra-ui/react';
import { FieldLabel, FieldSelect } from '../sidebar/ui';
import HttpKeyValueRow from '../ui/HttpKeyValueRow';
import PanelLineTabs from '../ui/PanelLineTabs';
import { Wand2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useSessionStore, useSettingsStore } from '../../store';
import { invoke } from '../../utils/tauri';
import { buildConnectPayload } from '../../utils/protocolConfig';
import { defineAppMonacoTheme, defineAppMonacoThemeSync } from '../../utils/monacoTheme';
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

function parseHttpResponse(logs: Session['logs']): ParsedHttpResponse | null {
  for (let i = logs.length - 1; i >= 0; i--) {
    const entry = logs[i];
    if (entry.direction !== 'system') {
      continue;
    }
    const text = new TextDecoder().decode(new Uint8Array(entry.data));
    const match = text.match(/^HTTP\s+(\d{3})\s+(.+)\s*\((\d+)\s*ms\)\n/);
    if (!match) {
      continue;
    }
    const statusCode = parseInt(match[1], 10);
    const statusText = match[2].trim();
    const elapsedMs = parseInt(match[3], 10);

    /* Parse headers from the system log line */
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

    /* Body is sent as a separate 'recv' event right after the system event */
    let bodyText = '';
    for (let j = i + 1; j < logs.length; j++) {
      if (logs[j].direction === 'recv') {
        bodyText = new TextDecoder().decode(new Uint8Array(logs[j].data));
        break;
      }
    }

    return { statusCode, statusText, elapsedMs, headers, bodyText, bodySize: bodyText.length, contentType };
  }
  return null;
}

function statusColorClass(code: number): string {
  if (code >= 200 && code < 300) {
    return 'text-[var(--color-success)]';
  }
  if (code >= 300 && code < 400) {
    return 'text-[var(--color-warning)]';
  }
  if (code >= 400 && code < 500) {
    return 'text-[var(--color-warning)]';
  }
  if (code >= 500) {
    return 'text-[var(--color-error)]';
  }
  return 'text-[var(--color-text-muted)]';
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

/* Build URL with query params — preserves path, replaces query string */
function buildUrlWithParams(url: string, params: HttpQueryParam[]): string {
  if (!url) {
    return url;
  }
  const enabled = params.filter(p => p.enabled && p.key.trim());
  if (enabled.length === 0) {
    // strip query string if no params
    return url.split('?')[0];
  }
  const qs = enabled.map(p => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value)}`).join('&');
  const base = url.split('?')[0];
  return `${base}?${qs}`;
}


const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

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
  const addSendHistory = useSessionStore(s => s.addSendHistory);
  const addTxBytes = useSessionStore(s => s.addTxBytes);
  const appTheme = useSettingsStore(s => s.theme);

  const [reqTab, setReqTab] = useState<RequestTab>('body');
  const [resTab, setResTab] = useState<ResponseTab>('body');
  const [sending, setSending] = useState(false);

  const { config } = session;

  const {
    draft: urlDraft,
    setDraft: setUrlDraft,
  } = useDebouncedControlledValue(config.httpUrl ?? '', (next) => {
    updateConfig(session.id, { httpUrl: next });
  }, CONFIG_FIELD_DEBOUNCE_MS);

  /* Normalize httpBody — defends against stale/malformed persisted data */
  const safeBody = useMemo(() => {
    const b = config.httpBody;
    if (b && typeof b === 'object' && 'type' in b) {
      const type = (b as { type: unknown }).type as HttpBody['type'];
      const content = typeof (b as { content?: unknown }).content === 'string'
        ? (b as { content: string }).content
        : '';
      return { type, content } as HttpBody & { content: string };
    }
    return { type: 'none' as const, content: '' };
  }, [config.httpBody]);

  const {
    draft: bodyDraft,
    setDraft: setBodyDraft,
  } = useDebouncedControlledValue(safeBody.content, (next) => {
    const newBody: HttpBody = safeBody.type === 'json'
      ? { type: 'json', content: next }
      : { type: 'text', content: next };
    updateConfig(session.id, { httpBody: newBody });
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

  const response = useMemo(() => parseHttpResponse(session.logs), [session.logs]);
  const bodyMode = response ? detectBodyMode(response.contentType) : 'text';

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
      updateConfig(session.id, { httpBody: { type: 'none' }, httpHeaders: nextHeaders });
      return;
    }

    const ctValue = type === 'json' ? 'application/json' : 'text/plain';
    if (ctIndex >= 0) {
      nextHeaders[ctIndex] = { ...nextHeaders[ctIndex], value: ctValue };
    } else {
      nextHeaders.push({ key: 'Content-Type', value: ctValue, enabled: true });
    }

    const currentBody = safeBody;
    const newBody: HttpBody = type === 'json'
      ? { type: 'json', content: currentBody.type === 'none' ? '' : currentBody.content }
      : { type: 'text', content: currentBody.type === 'none' ? '' : currentBody.content };

    updateConfig(session.id, { httpBody: newBody, httpHeaders: nextHeaders });
  };

  /* ─── Body helpers ─── */

  /* ─── Send ─── */

  const handleSend = useCallback(async () => {
    if (!config.httpUrl) {
      return;
    }
    setSending(true);

    const enabledHeaders = httpHeaders.filter(h => h.enabled);
    const headerMap: Record<string, string> = {};
    for (const h of enabledHeaders) {
      if (h.key.trim()) {
        headerMap[h.key] = h.value;
      }
    }

    const bodyStr = safeBody.type === 'none'
      ? undefined
      : safeBody.content.trim() || undefined;
    const httpPayload = {
      method: config.httpMethod,
      url: config.httpUrl,
      headers: headerMap,
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
    } finally {
      setSending(false);
    }
  }, [session.id, config, httpHeaders, safeBody, appendLog, addSendHistory, addTxBytes, t]);

  /* ─── Copy response ─── */

  const handleCopyResponse = () => {
    if (response?.bodyText) {
      void window.navigator.clipboard.writeText(response.bodyText).then(() => showToast('success', t('toast.copiedToClipboard')));
    }
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
    if (!response) {
      return (
        <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]/60 text-sm font-[family-name:var(--font-mono)]">
          {sending ? (
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
              Waiting for response...
            </div>
          ) : (
            'Send a request to see the response'
          )}
        </div>
      );
    }

    const text = response.bodyText;
    if (!text) {
      return (
        <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]/60 text-sm font-[family-name:var(--font-mono)]">
          Empty response body
        </div>
      );
    }

    const lang = bodyMode === 'json' ? 'json' : bodyMode === 'html' ? 'html' : bodyMode === 'xml' ? 'xml' : 'plaintext';
    return (
      <div className="h-full overflow-hidden">
        <Editor
          value={text}
          language={lang}
          theme={`app-${appTheme}`}
          beforeMount={monaco => { defineAppMonacoThemeSync(monaco, appTheme); }}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: 'var(--font-mono)',
            lineNumbers: 'on',
            renderWhitespace: 'none',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 8 },
            wordWrap: 'on',
            readOnly: true,
          }}
        />
      </div>
    );
  };

  const renderResponseHeaders = () => {
    if (!response) {
      return (
        <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]/60 text-sm font-[family-name:var(--font-mono)]">
          No response yet
        </div>
      );
    }
    const entries = Object.entries(response.headers);
    if (entries.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]/60 text-sm font-[family-name:var(--font-mono)]">
          No headers
        </div>
      );
    }
    return (
      <div className="p-2 overflow-auto h-full">
        <table className="w-full text-xs font-[family-name:var(--font-mono)]">
          <tbody>
            {entries.map(([key, value]) => (
              <tr key={key} className="border-b border-[var(--color-border-subtle)]/50">
                <td className="py-1.5 pr-3 text-[var(--color-primary)] whitespace-nowrap align-top">{key}</td>
                <td className="py-1.5 text-[var(--color-text-secondary)] break-all">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full gap-2">
      {/* ─── Top Request Bar ─── */}
      <Flex
        align="center"
        gap="2"
        px="3"
        py="2"
        flexShrink={0}
        bg="bg.panel"
        borderBottomWidth="1px"
        borderColor="border"
      >
        <FieldSelect
          value={config.httpMethod}
          onChange={(v) => updateConfig(session.id, { httpMethod: v as HttpMethod })}
          options={HTTP_METHODS.map((m) => ({ value: m, label: m }))}
          width="auto"
          fontWeight="bold"
          textTransform="uppercase"
          height="9"
        />
        <Input
          flex="1"
          minW="0"
          size="sm"
          height="9"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          placeholder="https://api.example.com"
          fontFamily="mono"
        />
        <Button
          flexShrink={0}
          height="9"
          onClick={handleSend}
          disabled={sending || !config.httpUrl}
          loading={sending}
          loadingText={t('network.connecting')}
          bg="accent"
          color="accent.fg"
          _hover={{ bg: 'accent.emphasized' }}
          textTransform="uppercase"
          fontWeight="bold"
          letterSpacing="wider"
        >
          {!sending && (
            <Flex align="center" gap="1.5">
              {t('send.sendBtn')}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </Flex>
          )}
        </Button>
      </Flex>

      {/* ─── Main Content: Request | Response ─── */}
      <div className="flex-1 flex gap-2 min-h-0 px-2 pb-2">
        {/* Left: Request */}
        <div className="flex-1 flex flex-col min-h-0 glass-panel overflow-hidden">
          {/* Request tab bar */}
          <PanelLineTabs
            tabs={reqTabs.map((tab) => ({ key: tab.key, label: tab.label, count: tab.count }))}
            value={reqTab}
            onChange={(key) => setReqTab(key as RequestTab)}
          />

          {/* Request content */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3">
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
              <div className="h-full flex flex-col gap-2">
                {/* Body type selector */}
                <div className="flex items-center gap-2">
                  <FieldSelect
                    value={safeBody.type}
                    onChange={(v) => setBodyType(v as HttpBody['type'])}
                    options={[
                      { value: 'none', label: 'none' },
                      { value: 'text', label: 'text' },
                      { value: 'json', label: 'json' },
                    ]}
                    width="auto"
                    fontSize="2xs"
                  />
                  {safeBody.type === 'json' && (
                    <Button
                      onClick={handleFormatJson}
                      title="Prettify"
                      size="xs"
                      variant="outline"
                      colorPalette="blue"
                      fontSize="2xs"
                    >
                      <Wand2 size={12} />
                      {t('http.formatJson')}
                    </Button>
                  )}
                </div>

                {/* Body editor */}
                {safeBody.type === 'none' ? (
                  <div className="flex items-center justify-center flex-1 text-xs text-[var(--color-text-muted)] font-[family-name:var(--font-mono)]">
                    No body for this request
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 rounded border border-[var(--color-border-subtle)] overflow-hidden">
                    <Editor
                      value={bodyDraft}
                      onChange={v => setBodyDraft(v ?? '')}
                      onMount={editor => { bodyEditorRef.current = editor; }}
                      beforeMount={monaco => { defineAppMonacoThemeSync(monaco, appTheme); }}
                      language={safeBody.type === 'json' ? 'json' : 'plaintext'}
                      theme={`app-${appTheme}`}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        fontFamily: 'var(--font-mono)',
                        lineNumbers: 'on',
                        renderLineHighlight: 'none',
                        renderWhitespace: 'none',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 8 },
                        wordWrap: 'on',
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {reqTab === 'auth' && (
              <Stack gap="3" maxW="360px">
                <Box>
                  <FieldLabel label={t('http.username')} />
                  <Input
                    size="sm"
                    value={authUserDraft}
                    onChange={(e) => {
                      const next = e.target.value;
                      setAuthUserDraft(next);
                      queueAuthCommit(next, authPassDraft);
                    }}
                    placeholder="username"
                    fontFamily="mono"
                    fontSize="xs"
                  />
                </Box>
                <Box>
                  <FieldLabel label={t('http.password')} />
                  <Input
                    size="sm"
                    type="password"
                    value={authPassDraft}
                    onChange={(e) => {
                      const next = e.target.value;
                      setAuthPassDraft(next);
                      queueAuthCommit(authUserDraft, next);
                    }}
                    placeholder="password"
                    fontFamily="mono"
                    fontSize="xs"
                  />
                </Box>
                {hasBasicAuth && (
                  <Text fontSize="2xs" color="success" fontFamily="mono">
                    Authorization header will be added automatically
                  </Text>
                )}
              </Stack>
            )}
          </div>
        </div>

        {/* Right: Response */}
        <div className="flex-1 flex flex-col min-h-0 glass-panel overflow-hidden">
          {/* Response status bar */}
          <div className="flex items-center gap-3 px-3 py-2 shrink-0 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-container-low)]">
            {!response ? (
              <span className="text-2xs text-[var(--color-text-muted)] font-[family-name:var(--font-mono)]">
                {sending ? 'Sending request...' : 'No response yet'}
              </span>
            ) : (
              <>
                <span className={`text-sm font-bold font-[family-name:var(--font-mono)] ${statusColorClass(response.statusCode)}`}>
                  {response.statusCode}
                </span>
                <span className="text-2xs text-[var(--color-text-secondary)]">
                  {response.statusText}
                </span>
                <span className="ml-2 text-2xs text-[var(--color-text-muted)] font-[family-name:var(--font-mono)]">
                  {response.elapsedMs}ms
                </span>
                <span className="ml-2 text-2xs text-[var(--color-text-muted)] font-[family-name:var(--font-mono)]">
                  {response.bodySize > 0 ? `${(response.bodySize / 1024).toFixed(1)} KB` : '—'}
                </span>
                <span className="ml-2 text-2xs text-[var(--color-text-muted)] font-[family-name:var(--font-mono)] uppercase">
                  {bodyMode}
                </span>
                <Flex ml="auto" gap="2">
                  <Button
                    onClick={handleCopyResponse}
                    disabled={!response?.bodyText}
                    size="xs"
                    variant="ghost"
                    colorPalette="blue"
                    textTransform="uppercase"
                    letterSpacing="wider"
                    fontWeight="bold"
                    fontSize="2xs"
                  >
                    {t('http.copyResponse')}
                  </Button>
                </Flex>
              </>
            )}
          </div>

          {/* Response tabs */}
                    <PanelLineTabs
            tabs={[
              { key: 'body', label: t('http.responseBody') },
              { key: 'headers', label: t('http.responseHeaders') },
            ]}
            value={resTab}
            onChange={(key) => setResTab(key as ResponseTab)}
          />

          {/* Response content */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-[var(--color-surface-dim)]">
            {resTab === 'body' ? renderResponseBody() : renderResponseHeaders()}
          </div>
        </div>
      </div>
    </div>
  );
}
