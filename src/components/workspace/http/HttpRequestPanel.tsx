import { memo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Flex, Input, Stack, Text } from '@chakra-ui/react';
import EditableKeyValueTable, { type KeyValueItem } from '../../ui/EditableKeyValueTable';
import HttpPathParamsTable from './HttpPathParamsTable';
import HeaderKeyAutocomplete from '../../ui/HeaderKeyAutocomplete';
import PanelLineTabs from '../../ui/PanelLineTabs';
import Tips, { TipsText } from '../../ui/Tips';
import { FieldLabel } from '../../sidebar/ui';
import { useSettingsStore } from '../../../store';
import { defineAppMonacoTheme } from '../../../utils/monacoTheme';
import { HTTP_PANEL_TOOLBAR_PROPS } from './httpResponse';
import { useHttpRequestEditor, type RequestTab } from './requestEditor.shared';
import HttpBodyEditor from './HttpBodyEditor';
function HttpRequestPanel() {
  const { t } = useTranslation();
  const appTheme = useSettingsStore((s) => s.theme);
  const {
    reqTab,
    setReqTab,
    sessionId,
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
    markFieldEditPending,
    authUserDraft,
    authPassDraft,
    hasBasicAuth,
    setAuthUserDraft,
    setAuthPassDraft,
    queueAuthCommit,
    configRevision,
  } = useHttpRequestEditor();

  useEffect(() => {
    void defineAppMonacoTheme(appTheme);
  }, [appTheme]);

  const renderHeaderKeyField = useCallback((
    _index: number,
    item: KeyValueItem,
    onKeyChange: (value: string) => void,
  ) => (
    <HeaderKeyAutocomplete
      value={item.key}
      onChange={onKeyChange}
      placeholder="Header"
    />
  ), []);

  const reqTabs = [
    { key: 'params' as const, label: t('http.queryParams'), count: localParamCount + localPathParamCount },
    { key: 'headers' as const, label: t('http.headers'), count: localHeaderCount },
    { key: 'body' as const, label: t('http.body') },
    { key: 'auth' as const, label: t('http.basicAuth') },
  ];

  return (
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
        p={reqTab === 'body' ? '0' : reqTab === 'auth' ? '4' : '0'}
        px={reqTab === 'params' || reqTab === 'headers' ? '4' : undefined}
        py={reqTab === 'params' || reqTab === 'headers' ? '3' : undefined}
        display="flex"
        flexDirection="column"
        bg="bg.panel"
        className="sidebar-scroll"
      >
        <Box display={reqTab === 'params' ? 'flex' : 'none'} flexDirection="column" width="full" gap="4">
          <Box>
            <Text fontSize="xs" fontWeight="semibold" color="fg.muted" mb="2" letterSpacing="wide">
              {t('http.querySection')}
            </Text>
            <EditableKeyValueTable
              ref={paramsTableRef}
              sessionId={sessionId}
              resetRevision={configRevision}
              items={httpParams}
              onCommit={handleCommitParams}
              onItemsChange={handleParamsItemsChange}
              onEditStart={markFieldEditPending}
              keyPlaceholder="Key"
              valuePlaceholder="Value"
              keyHeader={t('http.paramName')}
              valueHeader={t('http.paramValue')}
            />
          </Box>
          <Box>
            <Flex align="center" gap="1.5" mb="2">
              <Text fontSize="xs" fontWeight="semibold" color="fg.muted" letterSpacing="wide">
                {t('http.pathSection')}
              </Text>
              <Tips label={t('http.pathParamsTipLabel')}>
                <Stack gap="1.5">
                  <TipsText>{t('http.pathParamsTip')}</TipsText>
                  <TipsText mono>{t('http.pathParamsTipExample')}</TipsText>
                </Stack>
              </Tips>
            </Flex>
            <HttpPathParamsTable
              ref={pathParamsTableRef}
              sessionId={sessionId}
              resetRevision={configRevision}
              items={httpPathParams}
              onCommit={handleCommitPathParams}
              onItemsChange={handlePathParamsItemsChange}
              onEditStart={markFieldEditPending}
              valuePlaceholder="Value"
              keyHeader={t('http.paramName')}
              valueHeader={t('http.paramValue')}
            />
          </Box>
        </Box>

        <Box display={reqTab === 'headers' ? 'flex' : 'none'} flexDirection="column" width="full">
          <EditableKeyValueTable
            ref={headersTableRef}
            sessionId={sessionId}
            resetRevision={configRevision}
            items={httpHeaders}
            onCommit={handleCommitHeaders}
            onItemsChange={handleHeadersItemsChange}
            onEditStart={markFieldEditPending}
            renderKeyField={renderHeaderKeyField}
            keyPlaceholder="Header"
            valuePlaceholder="Value"
            keyHeader={t('http.headerName')}
            valueHeader={t('http.headerValue')}
          />
        </Box>

        {reqTab === 'body' && (
          <HttpBodyEditor
            key={`${sessionId}:${safeBody.type}:${configRevision}`}
            ref={bodyEditorRef}
            bodyType={safeBody.type}
            initialContent={safeBody.content}
            bodyAllowed={bodyAllowed}
            appTheme={appTheme}
            onCommit={handleBodyCommit}
            onTypeChange={setBodyType}
            onEditStart={markFieldEditPending}
          />
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
  );
}

export default memo(HttpRequestPanel);
