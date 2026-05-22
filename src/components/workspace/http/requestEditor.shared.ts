import { createContext, useContext } from 'react';
import type { RefObject } from 'react';
import type { EditableKeyValueTableHandle, KeyValueItem } from '../../ui/EditableKeyValueTable';
import type { HttpBodyEditorHandle } from './HttpBodyEditor';
import type { HttpBody, HttpMethod } from '../../../types';
import type { NormalizedHttpBody } from '../../../utils/http';

export type RequestTab = 'params' | 'headers' | 'body' | 'auth';

export interface HttpRequestEditorHandle {
  getSendSnapshot: () => {
    url: string;
    urlBase: string;
    params: KeyValueItem[];
    pathParams: KeyValueItem[];
    headers: KeyValueItem[];
    bodyContent: string;
  };
  flushRequestFields: () => void;
}

export interface HttpRequestEditorContextValue {
  sessionId: string;
  reqTab: RequestTab;
  setReqTab: (tab: RequestTab) => void;
  httpMethod: HttpMethod;
  displayUrl: string;
  handleUrlChange: (value: string) => void;
  markFieldEditPending: () => void;
  handleMethodChange: (method: HttpMethod) => void;
  httpParams: KeyValueItem[];
  httpPathParams: KeyValueItem[];
  httpHeaders: KeyValueItem[];
  safeBody: NormalizedHttpBody;
  bodyAllowed: boolean;
  localParamCount: number;
  localPathParamCount: number;
  localHeaderCount: number;
  paramsTableRef: RefObject<EditableKeyValueTableHandle | null>;
  pathParamsTableRef: RefObject<EditableKeyValueTableHandle | null>;
  headersTableRef: RefObject<EditableKeyValueTableHandle | null>;
  bodyEditorRef: RefObject<HttpBodyEditorHandle | null>;
  handleParamsItemsChange: (items: KeyValueItem[]) => void;
  handlePathParamsItemsChange: (items: KeyValueItem[]) => void;
  handleHeadersItemsChange: (items: KeyValueItem[]) => void;
  handleCommitParams: (items: KeyValueItem[]) => void;
  handleCommitPathParams: (items: KeyValueItem[]) => void;
  handleCommitHeaders: (items: KeyValueItem[]) => void;
  setBodyType: (type: HttpBody['type']) => void;
  handleBodyCommit: (content: string) => void;
  authUserDraft: string;
  authPassDraft: string;
  hasBasicAuth: boolean;
  setAuthUserDraft: (value: string) => void;
  setAuthPassDraft: (value: string) => void;
  queueAuthCommit: (user: string, pass: string) => void;
  displayUrlRef: RefObject<string>;
  urlBaseRef: RefObject<string>;
  configRevision: number;
}

export const HttpRequestEditorContext = createContext<HttpRequestEditorContextValue | null>(null);

export function useHttpRequestEditor() {
  const ctx = useContext(HttpRequestEditorContext);
  if (!ctx) {
    throw new Error('useHttpRequestEditor must be used within HttpRequestEditorProvider');
  }
  return ctx;
}
