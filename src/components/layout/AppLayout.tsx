import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Save } from 'lucide-react';
import { Box, Button, Flex, IconButton } from '@chakra-ui/react';
import i18n from '../../i18n';
import {
  useSessionStore,
  useSettingsStore,
  getActiveSession,
  getAllSessions,
  getOpenedTabView,
  getDirtyOpenedTabs,
  hasUnsavedSessions,
  getSessionGroupPath,
} from '../../store';
import { invoke } from '../../utils/tauri';
import { flushStorage, flushDeferred } from '../../store/storage';
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

import { SIDEBAR_WIDTH } from '../../config/constants';

/** `null` = closing the app; otherwise the tab session id being closed. */
type CloseConfirmTarget = 'app' | string | null;

export default function AppLayout() {
  const { t } = useTranslation();

  const rootChildren = useSessionStore((s) => s.rootChildren);
  const tabDrafts = useSessionStore((s) => s.tabDrafts);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const setActive = useSessionStore((s) => s.setActiveSession);
  const closeSessionTab = useSessionStore((s) => s.closeSessionTab);
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
    () => ({ rootChildren, tabDrafts, activeSessionId }),
    [rootChildren, tabDrafts, activeSessionId],
  );

  // Merged view must not live inside useSessionStore — getActiveSession returns a
  // new object each call, which breaks getSnapshot equality and loops in React 19.
  const activeSession = useMemo(
    () => getActiveSession(sessionSlice),
    [sessionSlice],
  );

  const tabSessions = useMemo(
    () =>
      getAllSessions(sessionSlice)
        .filter((s) => s.opened)
        .map((s) => getOpenedTabView(sessionSlice, s.id))
        .filter((v): v is NonNullable<typeof v> => v !== null),
    [sessionSlice],
  );

  const [aboutOpen, setAboutOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [closeTarget, setCloseTarget] = useState<CloseConfirmTarget>(null);
  const [protocolSelectorOpen, setProtocolSelectorOpen] = useState(false);
  const [pendingParentGroupId, setPendingParentGroupId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isExiting, setIsExiting] = useState(false);

  const requestCloseConfirm = (target: CloseConfirmTarget) => {
    setCloseTarget(target);
    setCloseConfirmOpen(true);
  };

  const dismissCloseConfirm = () => {
    setCloseConfirmOpen(false);
    setCloseTarget(null);
    setIsExiting(false);
  };

  /** Closing a tab is a view-level action — never deletes the catalog session. */
  const handleCloseTab = (id: string) => {
    if (tabDrafts[id]?.dirty) {
      requestCloseConfirm(id);
      return;
    }
    closeSessionTab(id);
  };

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
      const dirty = hasUnsavedSessions(useSessionStore.getState());
      if (!dirty) {
        return;
      }
      event.preventDefault();
      requestCloseConfirm('app');
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, [win]);

  const handleWindowClose = () => {
    const dirty = hasUnsavedSessions(useSessionStore.getState());
    if (dirty) {
      requestCloseConfirm('app');
    } else {
      void invoke('exit_app');
    }
  };

  const finishCloseTab = (id: string) => {
    closeSessionTab(id);
    dismissCloseConfirm();
  };

  const handleSaveAndClose = async () => {
    setIsExiting(true);
    try {
      if (closeTarget === 'app') {
        await saveAll();
        await invoke('exit_app');
        return;
      }
      if (typeof closeTarget === 'string') {
        saveSession(closeTarget);
        await flushDeferred();
        finishCloseTab(closeTarget);
      }
    } catch (e) {
      showToast('error', `${t('toast.saveFailed')}: ${e}`);
      setIsExiting(false);
    }
  };

  const handleDiscardAndClose = async () => {
    setIsExiting(true);
    try {
      if (closeTarget === 'app') {
        discardAllUnsavedDrafts();
        await flushStorage();
        await invoke('exit_app');
        return;
      }
      if (typeof closeTarget === 'string') {
        revertTabDraft(closeTarget);
        finishCloseTab(closeTarget);
      }
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

  const winBtn = (onClick: () => void, icon: ReactNode, title: string) => (
    <IconButton
      aria-label={title}
      title={title}
      variant="ghost"
      size="sm"
      width="11"
      height="10"
      rounded="sm"
      color="fg.muted"
      _hover={{ bg: 'whiteAlpha.50', color: 'fg' }}
      onClick={onClick}
    >
      {icon}
    </IconButton>
  );

  return (
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
        height="10"
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
          onNewSession={() => handleNewSession(null)}
          newSessionTitle={t('header.newSession')}
        />

        <Flex align="center" flexShrink={0}>
          <Flex align="center" gap="1" mr="2">
            <IconButton
              aria-label={t('closeConfirm.save')}
              title={`${t('closeConfirm.save')} (Ctrl+S)`}
              variant="ghost"
              size="sm"
              position="relative"
              color={hasUnsaved ? 'accent' : 'fg.subtle'}
              disabled={!hasUnsaved}
              onClick={handleManualSave}
              _hover={hasUnsaved ? { color: 'accent', bg: 'accent.subtle' } : undefined}
            >
              <Save size={14} strokeWidth={2} />
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
              variant="ghost"
              size="sm"
              color="fg.muted"
              _hover={{ color: 'accent' }}
              onClick={() => openUrl(APP.github)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </IconButton>
            <Button variant="ghost" size="sm" color="fg.muted" onClick={() => setAboutOpen(true)}>
              {t('header.about')}
            </Button>
            <IconButton
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              variant="ghost"
              size="sm"
              color="fg.muted"
              onClick={() => {
                const next = theme === 'dark' ? 'light' : 'dark';
                setTheme(next);
                document.documentElement.setAttribute('data-theme', next);
              }}
            >
              {theme === 'dark' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </IconButton>
            <Button
              variant="ghost"
              size="sm"
              color="fg.muted"
              title={locale === 'en' ? '切换为中文' : 'Switch to English'}
              onClick={handleToggleLang}
            >
              {locale === 'en' ? '中文' : 'EN'}
            </Button>
          </Flex>
          {winBtn(
            () => win.minimize(),
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /></svg>,
            t('header.minimize'),
          )}
          {winBtn(
            () => win.toggleMaximize(),
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="1" /></svg>,
            t('header.maximize'),
          )}
          {winBtn(
            handleWindowClose,
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
            t('header.close'),
          )}
        </Flex>
      </Flex>

      <Box as="main" flex="1" ml={SIDEBAR_WIDTH} display="flex" gap="2" p="2" overflow="hidden" minH="0">
        {!activeSession ? (
          <Box flex="1" className="glass-panel" overflow="hidden">
            <EmptyWorkspace />
          </Box>
        ) : activeSession.config.protocol === 'HTTP' ? (
          <HttpProtocolLayout session={activeSession} />
        ) : (
          <StreamProtocolLayout session={activeSession} />
        )}
      </Box>

      <Box ml={SIDEBAR_WIDTH}>
        <StatusBar session={activeSession} />
      </Box>

      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <CloseConfirmDialog
        open={closeConfirmOpen}
        isExiting={isExiting}
        unsavedSessions={unsavedSessions}
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
  );
}
