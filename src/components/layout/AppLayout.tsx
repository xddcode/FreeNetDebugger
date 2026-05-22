import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Github, Save } from 'lucide-react';
import { Box, Button, Flex, IconButton } from '@chakra-ui/react';
import i18n from '../../i18n';
import {
  useSessionStore,
  useSettingsStore,
  getActiveSession,
  getOpenedTabSessions,
  getOpenedTabView,
  getDirtyOpenedTabs,
  hasUnsavedSessions,
  getSessionGroupPath,
  isStreamSession,
} from '../../store';
import { invoke } from '../../utils/tauri';
import { flushStorage, flushDeferred, persistSessionLayout } from '../../store/storage';
import SideNavBar from './SideNavBar';
import SessionTabBar from './SessionTabBar';
import StatusBar from '../status/StatusBar';
import AboutDialog from '../AboutDialog';
import CloseConfirmDialog from '../CloseConfirmDialog';
import EmptyWorkspace from '../workspace/EmptyWorkspace';
import ProtocolSelectorModal from '../workspace/ProtocolSelectorModal';
import StreamProtocolLayout from '../workspace/StreamProtocolLayout';
import HttpProtocolLayout from '../workspace/HttpProtocolLayout';
import ToastContainer from '../toast/ToastContainer';
import { showToast } from '../../store/toastStore';
import { APP } from '../../config/app';
import { UnsavedGuardProvider } from '../../context/UnsavedGuardContext';
import {
  guardTargetNeedsConfirm,
  syncTabFieldEditors,
  type GuardTarget,
} from '../../services/unsavedChangesService';
import type { GuardedProceed } from '../../context/UnsavedGuardContext';

import {
  APP_HEADER_ACTION_BTN_SIZE,
  APP_HEADER_ACTION_ICON_PX,
  APP_HEADER_HEIGHT,
  APP_HEADER_WIN_BTN_HEIGHT,
  APP_HEADER_WIN_ICON_PX,
  SIDEBAR_WIDTH,
} from '../../config/constants';

/** Pending guarded action — close app, close tab, or export. */
type GuardDialogTarget = GuardTarget | null;

export default function AppLayout() {
  const { t } = useTranslation();

  const rootChildren = useSessionStore((s) => s.rootChildren);
  const tabDrafts = useSessionStore((s) => s.tabDrafts);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const openedTabOrder = useSessionStore((s) => s.openedTabOrder);
  const setActive = useSessionStore((s) => s.setActiveSession);
  const closeSessionTab = useSessionStore((s) => s.closeSessionTab);
  const setOpenTabOrder = useSessionStore((s) => s.setOpenTabOrder);
  const renameSessionDraft = useSessionStore((s) => s.renameSessionDraft);
  const saveAll = useSessionStore((s) => s.saveAll);
  const saveSession = useSessionStore((s) => s.saveSession);
  const discardAllUnsavedDrafts = useSessionStore((s) => s.discardAllUnsavedDrafts);
  const revertTabDraft = useSessionStore((s) => s.revertTabDraft);
  const locale = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const sessionSlice = useMemo(
    () => ({ rootChildren, tabDrafts, activeSessionId, openedTabOrder }),
    [rootChildren, tabDrafts, activeSessionId, openedTabOrder],
  );

  // Merged view must not live inside useSessionStore — getActiveSession returns a
  // new object each call, which breaks getSnapshot equality and loops in React 19.
  const activeSession = useMemo(
    () => getActiveSession(sessionSlice),
    [sessionSlice],
  );

  const tabSessions = useMemo(
    () => getOpenedTabSessions(sessionSlice),
    [sessionSlice],
  );

  const [aboutOpen, setAboutOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [guardTarget, setGuardTarget] = useState<GuardDialogTarget>(null);
  const [pendingProceed, setPendingProceed] = useState<GuardedProceed | null>(null);
  const [protocolSelectorOpen, setProtocolSelectorOpen] = useState(false);
  const [pendingParentGroupId, setPendingParentGroupId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isExiting, setIsExiting] = useState(false);

  const dismissCloseConfirm = () => {
    setCloseConfirmOpen(false);
    setGuardTarget(null);
    setPendingProceed(null);
    setIsExiting(false);
  };

  const requestGuardedAction = useCallback((target: GuardTarget, proceed: GuardedProceed) => {
    if (target.kind === 'app') {
      syncTabFieldEditors();
    } else {
      syncTabFieldEditors(target.sessionId);
    }

    const state = useSessionStore.getState();
    if (!guardTargetNeedsConfirm(state, target)) {
      void Promise.resolve(proceed());
      return;
    }

    setPendingProceed(() => proceed);
    setGuardTarget(target);
    setCloseConfirmOpen(true);
  }, []);

  /** Closing a tab is a view-level action — never deletes the catalog session. */
  const handleCloseTab = useCallback((id: string) => {
    requestGuardedAction({ kind: 'closeTab', sessionId: id }, () => {
      closeSessionTab(id);
    });
  }, [requestGuardedAction, closeSessionTab]);

  const handleNewSession = (parentGroupId: string | null = null) => {
    setPendingParentGroupId(parentGroupId);
    setProtocolSelectorOpen(true);
  };

  const handleToggleLang = () => {
    const next = locale === 'en' ? 'zh-CN' : 'en';
    setLocale(next);
    i18n.changeLanguage(next);
    document.documentElement.lang = next === 'zh-CN' ? 'zh-CN' : 'en';
  };

  const handleStartRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleConfirmRename = () => {
    if (editingId) {
      renameSessionDraft(editingId, editingName);
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditingName('');
  };

  const win = getCurrentWindow();

  useEffect(() => {
    const unlisten = win.onCloseRequested((event) => {
      syncTabFieldEditors();
      const dirty = hasUnsavedSessions(useSessionStore.getState());
      if (!dirty) {
        return;
      }
      event.preventDefault();
      setPendingProceed(async () => {
        await invoke('exit_app');
      });
      setGuardTarget({ kind: 'app' });
      setCloseConfirmOpen(true);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, [win]);

  const handleWindowClose = useCallback(() => {
    requestGuardedAction({ kind: 'app' }, async () => {
      await invoke('exit_app');
    });
  }, [requestGuardedAction]);

  const handleSaveAndClose = async () => {
    setIsExiting(true);
    try {
      if (!guardTarget) {
        return;
      }
      if (guardTarget.kind === 'app') {
        await saveAll();
        await flushDeferred();
        await invoke('exit_app');
        return;
      }

      const { sessionId } = guardTarget;
      saveSession(sessionId);
      await flushDeferred();

      if (guardTarget.kind === 'closeTab') {
        closeSessionTab(sessionId);
      } else {
        await pendingProceed?.();
      }
      dismissCloseConfirm();
    } catch (e) {
      showToast('error', `${t('toast.saveFailed')}: ${e}`);
      setIsExiting(false);
    }
  };

  const handleDiscardAndClose = async () => {
    setIsExiting(true);
    try {
      if (!guardTarget) {
        return;
      }
      if (guardTarget.kind === 'app') {
        discardAllUnsavedDrafts();
        await flushStorage();
        await invoke('exit_app');
        return;
      }

      const { sessionId } = guardTarget;
      if (guardTarget.kind === 'closeTab') {
        revertTabDraft(sessionId);
        closeSessionTab(sessionId);
      } else {
        await pendingProceed?.();
      }
      dismissCloseConfirm();
    } catch (e) {
      showToast('error', `${t('toast.saveFailed')}: ${e}`);
      setIsExiting(false);
    }
  };

  const unsavedSessions = useMemo(
    () =>
      getDirtyOpenedTabs(sessionSlice).map((s) => ({
        session: s,
        path: getSessionGroupPath(sessionSlice, s.id).map((g) => g.name),
      })),
    [sessionSlice],
  );

  const dialogUnsavedSessions = useMemo(() => {
    if (guardTarget?.kind === 'closeTab' || guardTarget?.kind === 'export') {
      const view = getOpenedTabView(sessionSlice, guardTarget.sessionId);
      if (!view) {
        return [];
      }
      return [{
        session: view,
        path: getSessionGroupPath(sessionSlice, guardTarget.sessionId).map((g) => g.name),
      }];
    }
    return unsavedSessions;
  }, [guardTarget, unsavedSessions, sessionSlice]);

  const confirmVariant = guardTarget?.kind === 'export' ? 'export' : 'close';
  const hasUnsaved = unsavedSessions.length > 0;

  const handleManualSave = () => {
    if (hasUnsaved) {
      void saveAll().then(() => {
        showToast('success', t('toast.saved'));
      });
    } else {
      void flushDeferred();
      showToast('info', t('toast.nothingToSave'));
    }
  };

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      syncTabFieldEditors();
      if (hasUnsavedSessions(useSessionStore.getState())) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        persistSessionLayout();
      }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isSave =
        (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 's' || e.key === 'S');
      if (!isSave) {
        return;
      }
      e.preventDefault();
      const dirty = hasUnsavedSessions(useSessionStore.getState());
      if (dirty) {
        void saveAll().then(() => {
          showToast('success', t('toast.saved'));
        });
      } else {
        void flushDeferred();
        showToast('info', t('toast.nothingToSave'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saveAll, t]);

  const headerActionIconCss = {
    '& svg': {
      width: `${APP_HEADER_ACTION_ICON_PX}px`,
      height: `${APP_HEADER_ACTION_ICON_PX}px`,
      flexShrink: 0,
    },
  };

  const headerActionBtnProps = {
    variant: 'ghost' as const,
    minW: APP_HEADER_ACTION_BTN_SIZE,
    w: APP_HEADER_ACTION_BTN_SIZE,
    h: APP_HEADER_ACTION_BTN_SIZE,
    p: '0',
    color: 'fg.muted',
    css: headerActionIconCss,
    _hover: { color: 'fg', bg: 'bg.muted' },
  };

  const winBtn = (onClick: () => void, icon: ReactNode, title: string) => (
    <IconButton
      aria-label={title}
      title={title}
      variant="ghost"
      width="11"
      height={APP_HEADER_WIN_BTN_HEIGHT}
      p="0"
      rounded="sm"
      color="fg.muted"
      css={{
        '& svg': {
          width: `${APP_HEADER_WIN_ICON_PX}px`,
          height: `${APP_HEADER_WIN_ICON_PX}px`,
        },
      }}
      _hover={{ bg: 'whiteAlpha.50', color: 'fg' }}
      onClick={onClick}
    >
      {icon}
    </IconButton>
  );

  const guardContextValue = useMemo(
    () => ({ requestGuardedAction }),
    [requestGuardedAction],
  );

  return (
    <UnsavedGuardProvider value={guardContextValue}>
    <Box position="relative" display="flex" flexDirection="column" height="full" width="full" overflow="hidden" bg="bg">
      <SideNavBar onAddSession={handleNewSession} />

      <Flex
        as="header"
        position="relative"
        zIndex="20"
        align="center"
        justify="space-between"
        pl={SIDEBAR_WIDTH}
        pr="0"
        height={APP_HEADER_HEIGHT}
        flexShrink={0}
        bg="bg.panel"
        opacity={0.95}
        backdropFilter="blur(12px)"
        borderBottomWidth="1px"
        borderColor="border"
      >
        <SessionTabBar
          sessions={tabSessions}
          activeId={activeSessionId}
          editingId={editingId}
          editingName={editingName}
          onSelect={setActive}
          onStartRename={handleStartRename}
          onEditingNameChange={setEditingName}
          onConfirmRename={handleConfirmRename}
          onCancelRename={handleCancelRename}
          onCloseSession={handleCloseTab}
          onReorderOrder={setOpenTabOrder}
          onNewSession={() => handleNewSession(null)}
          newSessionTitle={t('header.newSession')}
        />

        <Flex align="center" flexShrink={0}>
          <Flex align="center" gap="0.5" mr="2">
            <IconButton
              aria-label={t('closeConfirm.save')}
              title={`${t('closeConfirm.save')} (Ctrl+S)`}
              {...headerActionBtnProps}
              position="relative"
              color={hasUnsaved ? 'accent' : 'fg.muted'}
              disabled={!hasUnsaved}
              onClick={handleManualSave}
              _hover={hasUnsaved ? { color: 'accent', bg: 'accent.subtle' } : undefined}
            >
              <Save size={APP_HEADER_ACTION_ICON_PX} strokeWidth={2} />
              {hasUnsaved && (
                <Box
                  position="absolute"
                  top="1"
                  right="1"
                  w="1.5"
                  h="1.5"
                  rounded="full"
                  bg="accent"
                />
              )}
            </IconButton>
            <IconButton
              aria-label="GitHub"
              title="GitHub"
              {...headerActionBtnProps}
              _hover={{ color: 'accent', bg: 'accent.subtle' }}
              onClick={() => openUrl(APP.github)}
            >
              <Github size={APP_HEADER_ACTION_ICON_PX} strokeWidth={2} />
            </IconButton>
            <Button
              variant="ghost"
              size="sm"
              h={APP_HEADER_ACTION_BTN_SIZE}
              px="2.5"
              fontSize="sm"
              color="fg.muted"
              _hover={{ color: 'fg', bg: 'bg.muted' }}
              onClick={() => setAboutOpen(true)}
            >
              {t('header.about')}
            </Button>
            <IconButton
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              {...headerActionBtnProps}
              onClick={() => {
                const next = theme === 'dark' ? 'light' : 'dark';
                setTheme(next);
                document.documentElement.setAttribute('data-theme', next);
              }}
            >
              {theme === 'dark' ? (
                <svg width={APP_HEADER_ACTION_ICON_PX} height={APP_HEADER_ACTION_ICON_PX} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width={APP_HEADER_ACTION_ICON_PX} height={APP_HEADER_ACTION_ICON_PX} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </IconButton>
            <Button
              variant="ghost"
              size="sm"
              h={APP_HEADER_ACTION_BTN_SIZE}
              px="2.5"
              fontSize="sm"
              color="fg.muted"
              _hover={{ color: 'fg', bg: 'bg.muted' }}
              title={locale === 'en' ? '切换为中文' : 'Switch to English'}
              onClick={handleToggleLang}
            >
              {locale === 'en' ? '中文' : 'EN'}
            </Button>
          </Flex>
          {winBtn(
            () => win.minimize(),
            <svg width={APP_HEADER_WIN_ICON_PX} height={APP_HEADER_WIN_ICON_PX} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /></svg>,
            t('header.minimize'),
          )}
          {winBtn(
            () => win.toggleMaximize(),
            <svg width={APP_HEADER_WIN_ICON_PX} height={APP_HEADER_WIN_ICON_PX} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="1" /></svg>,
            t('header.maximize'),
          )}
          {winBtn(
            handleWindowClose,
            <svg width={APP_HEADER_WIN_ICON_PX} height={APP_HEADER_WIN_ICON_PX} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
            t('header.close'),
          )}
        </Flex>
      </Flex>

      <Box as="main" flex="1" ml={SIDEBAR_WIDTH} display="flex" gap="2" p="2" overflow="hidden" minH="0">
        {!activeSession ? (
          <Box flex="1" className="glass-panel" overflow="hidden">
            <EmptyWorkspace />
          </Box>
        ) : activeSession.protocol === 'HTTP' ? (
          <HttpProtocolLayout session={activeSession} />
        ) : isStreamSession(activeSession) ? (
          <StreamProtocolLayout session={activeSession} />
        ) : null}
      </Box>

      <Box ml={SIDEBAR_WIDTH}>
        <StatusBar session={activeSession} />
      </Box>

      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <CloseConfirmDialog
        open={closeConfirmOpen}
        isExiting={isExiting}
        variant={confirmVariant}
        unsavedSessions={dialogUnsavedSessions}
        onSave={handleSaveAndClose}
        onDiscard={handleDiscardAndClose}
        onCancel={dismissCloseConfirm}
      />
      <ProtocolSelectorModal
        open={protocolSelectorOpen}
        parentGroupId={pendingParentGroupId}
        onClose={() => {
          setProtocolSelectorOpen(false);
          setPendingParentGroupId(null);
        }}
      />
      <ToastContainer />
    </Box>
    </UnsavedGuardProvider>
  );
}
