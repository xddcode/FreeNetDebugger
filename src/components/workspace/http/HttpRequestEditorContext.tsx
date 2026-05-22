import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { useSessionStore, getHttpTabConfig } from '../../../store';
import { registerFieldEditorFlush } from '../../../store/fieldEditorFlushRegistry';
import {
  buildUrlWithParams,
  methodAllowsBody,
  stripUrlQuery,
  parseQueryParamsFromUrl,
  mergePathParamsFromUrl,
  normalizeHttpBody,
  commitHttpBodyContent,
  switchHttpBodyType,
} from '../../../utils/http';
import { CONFIG_FIELD_DEBOUNCE_MS } from '../../../config/constants';
import type { EditableKeyValueTableHandle, KeyValueItem } from '../../ui/EditableKeyValueTable';
import type { HttpBodyEditorHandle } from './HttpBodyEditor';
import type { HttpBody, HttpMethod, HttpConfig } from '../../../types';
import {
  HttpRequestEditorContext,
  type HttpRequestEditorContextValue,
  type HttpRequestEditorHandle,
  type RequestTab,
} from './requestEditor.shared';

interface ProviderProps {
  sessionId: string;
  editorRef: RefObject<HttpRequestEditorHandle | null>;
  configRevision?: number;
  children: ReactNode;
}

interface InnerProviderProps extends ProviderProps {
  config: HttpConfig;
}

export function HttpRequestEditorProvider({ sessionId, editorRef, configRevision = 0, children }: ProviderProps) {
  const config = useSessionStore(
    useCallback(
      (s) => getHttpTabConfig(s, sessionId) ?? undefined,
      [sessionId],
    ),
  );

  if (!config) {
    return null;
  }

  return (
    <HttpRequestEditorProviderInner sessionId={sessionId} editorRef={editorRef} config={config} configRevision={configRevision}>
      {children}
    </HttpRequestEditorProviderInner>
  );
}

function HttpRequestEditorProviderInner({
  sessionId,
  editorRef,
  config,
  configRevision = 0,
  children,
}: InnerProviderProps) {
  const updateConfig = useSessionStore((s) => s.updateConfig);
  const markDraftPendingFieldFlush = useSessionStore((s) => s.markDraftPendingFieldFlush);

  const [reqTab, setReqTab] = useState<RequestTab>('params');
  const paramsTableRef = useRef<EditableKeyValueTableHandle>(null);
  const pathParamsTableRef = useRef<EditableKeyValueTableHandle>(null);
  const headersTableRef = useRef<EditableKeyValueTableHandle>(null);
  const bodyEditorRef = useRef<HttpBodyEditorHandle>(null);

  const bodyAllowed = methodAllowsBody(config.httpMethod);
  const safeBody = useMemo(() => normalizeHttpBody(config.httpBody), [config.httpBody]);
  const httpHeaders = useMemo(() => config.httpHeaders ?? [], [config.httpHeaders]);
  const httpParams = useMemo(() => config.httpParams ?? [], [config.httpParams]);
  const httpPathParams = useMemo(() => config.httpPathParams ?? [], [config.httpPathParams]);

  const urlBaseRef = useRef(stripUrlQuery(config.httpUrl));
  const displayUrlRef = useRef(config.httpUrl);
  const [displayUrl, setDisplayUrl] = useState(config.httpUrl);
  const syncingParamsFromUrlRef = useRef(false);
  const syncingPathParamsFromUrlRef = useRef(false);

  const syncDisplayUrl = useCallback((url: string) => {
    displayUrlRef.current = url;
    urlBaseRef.current = stripUrlQuery(url);
    setDisplayUrl(url);
  }, []);

  const [localParamCount, setLocalParamCount] = useState(() =>
    httpParams.filter((p) => p.enabled && p.key).length,
  );
  const [localPathParamCount, setLocalPathParamCount] = useState(() =>
    httpPathParams.filter((p) => p.key).length,
  );
  const [localHeaderCount, setLocalHeaderCount] = useState(() =>
    httpHeaders.filter((h) => h.enabled && h.key).length,
  );

  const markFieldEditPending = useCallback(() => {
    markDraftPendingFieldFlush(sessionId);
  }, [markDraftPendingFieldFlush, sessionId]);

  const flushRequestFields = useCallback(() => {
    paramsTableRef.current?.flush();
    pathParamsTableRef.current?.flush();
    headersTableRef.current?.flush();
    bodyEditorRef.current?.flush();
    updateConfig(sessionId, { httpUrl: displayUrlRef.current });
  }, [sessionId, updateConfig]);

  useEffect(() => {
    return registerFieldEditorFlush(sessionId, flushRequestFields);
  }, [sessionId, flushRequestFields]);

  useEffect(() => {
    syncDisplayUrl(config.httpUrl);
    setLocalParamCount(httpParams.filter((p) => p.enabled && p.key).length);
    setLocalHeaderCount(httpHeaders.filter((h) => h.enabled && h.key).length);

    const mergedPath = mergePathParamsFromUrl(config.httpUrl, httpPathParams);
    const urlPathKeys = mergedPath.filter((p) => p.key).map((p) => p.key).join('\0');
    const storedPathKeys = httpPathParams.filter((p) => p.key).map((p) => p.key).join('\0');
    if (urlPathKeys !== storedPathKeys) {
      updateConfig(sessionId, { httpPathParams: mergedPath });
    }
    setLocalPathParamCount(
      (urlPathKeys !== storedPathKeys ? mergedPath : httpPathParams)
        .filter((p) => p.key).length,
    );
  }, [sessionId, configRevision, config.httpUrl, httpParams, httpPathParams, httpHeaders, syncDisplayUrl, updateConfig]);

  const handleParamsItemsChange = useCallback((items: KeyValueItem[]) => {
    setLocalParamCount(items.filter((p) => p.enabled && p.key).length);
    if (syncingParamsFromUrlRef.current) {
      return;
    }
    syncDisplayUrl(buildUrlWithParams(urlBaseRef.current, items));
  }, [syncDisplayUrl]);

  const handlePathParamsItemsChange = useCallback((items: KeyValueItem[]) => {
    setLocalPathParamCount(items.filter((p) => p.key).length);
  }, []);

  const handleHeadersItemsChange = useCallback((items: KeyValueItem[]) => {
    setLocalHeaderCount(items.filter((h) => h.enabled && h.key).length);
  }, []);

  const handleUrlChange = useCallback((value: string) => {
    syncDisplayUrl(value);
    const parsedQuery = parseQueryParamsFromUrl(value);
    const parsedPath = mergePathParamsFromUrl(value, pathParamsTableRef.current?.getItems() ?? httpPathParams);
    syncingParamsFromUrlRef.current = true;
    syncingPathParamsFromUrlRef.current = true;
    paramsTableRef.current?.syncItems(parsedQuery);
    pathParamsTableRef.current?.syncItems(parsedPath);
    syncingParamsFromUrlRef.current = false;
    syncingPathParamsFromUrlRef.current = false;
    setLocalParamCount(parsedQuery.filter((p) => p.enabled && p.key).length);
    setLocalPathParamCount(parsedPath.filter((p) => p.key).length);
    markFieldEditPending();
  }, [syncDisplayUrl, markFieldEditPending, httpPathParams]);

  const handleCommitParams = useCallback((items: KeyValueItem[]) => {
    const nextUrl = buildUrlWithParams(urlBaseRef.current, items);
    syncDisplayUrl(nextUrl);
    updateConfig(sessionId, {
      httpParams: items,
      httpUrl: nextUrl,
    });
  }, [sessionId, updateConfig, syncDisplayUrl]);

  const handleCommitPathParams = useCallback((items: KeyValueItem[]) => {
    updateConfig(sessionId, { httpPathParams: items });
  }, [sessionId, updateConfig]);

  const handleCommitHeaders = useCallback((items: KeyValueItem[]) => {
    updateConfig(sessionId, { httpHeaders: items });
  }, [sessionId, updateConfig]);

  const handleBodyCommit = useCallback((content: string) => {
    updateConfig(sessionId, { httpBody: commitHttpBodyContent(safeBody, content) });
  }, [sessionId, updateConfig, safeBody]);

  const authHeaderIndex = useMemo(
    () => httpHeaders.findIndex((h) => h.key.toLowerCase() === 'authorization'),
    [httpHeaders],
  );
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

  const setBasicAuth = useCallback((user: string, pass: string) => {
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
    updateConfig(sessionId, { httpHeaders: next });
  }, [authHeaderIndex, httpHeaders, sessionId, updateConfig]);

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

  const setBodyType = useCallback((type: HttpBody['type']) => {
    const bodyContent = bodyEditorRef.current?.getContent() ?? safeBody.content;
    let nextHeaders = [...httpHeaders];
    const ctIndex = nextHeaders.findIndex((h) => h.key.toLowerCase() === 'content-type');

    if (type === 'none') {
      if (ctIndex >= 0) {
        nextHeaders = nextHeaders.filter((_, i) => i !== ctIndex);
      }
      updateConfig(sessionId, {
        httpBody: switchHttpBodyType(safeBody, 'none', bodyContent),
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

    updateConfig(sessionId, {
      httpBody: switchHttpBodyType(safeBody, type, bodyContent),
      httpHeaders: nextHeaders,
    });
  }, [httpHeaders, safeBody, sessionId, updateConfig]);

  const handleMethodChange = useCallback((method: HttpMethod) => {
    updateConfig(sessionId, { httpMethod: method });
    if (!methodAllowsBody(method) && safeBody.type !== 'none') {
      setBodyType('none');
    }
  }, [sessionId, safeBody.type, setBodyType, updateConfig]);

  useEffect(() => {
    if (!editorRef) {
      return;
    }
    editorRef.current = {
      getSendSnapshot: () => ({
        url: displayUrlRef.current,
        urlBase: urlBaseRef.current,
        params: paramsTableRef.current?.getItems() ?? httpParams,
        pathParams: pathParamsTableRef.current?.getItems() ?? httpPathParams,
        headers: headersTableRef.current?.getItems() ?? httpHeaders,
        bodyContent: bodyEditorRef.current?.getContent() ?? safeBody.content,
      }),
      flushRequestFields,
    };
  }, [editorRef, flushRequestFields, httpHeaders, httpParams, httpPathParams, safeBody.content]);

  const value = useMemo<HttpRequestEditorContextValue>(() => ({
    sessionId,
    reqTab,
    setReqTab,
    httpMethod: config.httpMethod,
    displayUrl,
    handleUrlChange,
    markFieldEditPending,
    handleMethodChange,
    httpParams,
    httpPathParams,
    httpHeaders,
    safeBody,
    bodyAllowed,
    localParamCount,
    localPathParamCount,
    localHeaderCount,
    paramsTableRef,
    pathParamsTableRef,
    headersTableRef,
    bodyEditorRef,
    handleParamsItemsChange,
    handlePathParamsItemsChange,
    handleHeadersItemsChange,
    handleCommitParams,
    handleCommitPathParams,
    handleCommitHeaders,
    setBodyType,
    handleBodyCommit,
    authUserDraft,
    authPassDraft,
    hasBasicAuth,
    setAuthUserDraft,
    setAuthPassDraft,
    queueAuthCommit,
    displayUrlRef,
    urlBaseRef,
    configRevision,
  }), [
    sessionId,
    reqTab,
    config.httpMethod,
    displayUrl,
    handleUrlChange,
    markFieldEditPending,
    handleMethodChange,
    httpParams,
    httpPathParams,
    httpHeaders,
    safeBody,
    bodyAllowed,
    localParamCount,
    localPathParamCount,
    localHeaderCount,
    handleParamsItemsChange,
    handlePathParamsItemsChange,
    handleHeadersItemsChange,
    handleCommitParams,
    handleCommitPathParams,
    handleCommitHeaders,
    setBodyType,
    handleBodyCommit,
    authUserDraft,
    authPassDraft,
    hasBasicAuth,
    queueAuthCommit,
    configRevision,
  ]);

  return (
    <HttpRequestEditorContext.Provider value={value}>
      {children}
    </HttpRequestEditorContext.Provider>
  );
}
