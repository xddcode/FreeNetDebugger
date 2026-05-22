import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  CloseButton,
  Flex,
  Input,
  SegmentGroup,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react';
import { useSessionStore, useSettingsStore } from '../../store';
import { sendPanelBus } from '../../utils/sendPanelBus';
import { showToast } from '../../store/toastStore';
import type { EncodingMode, StreamSession } from '../../types';
import ScriptsPanel from '../scripts/ScriptsPanel';
import { FieldSelect } from '../sidebar/ui';

export type SendCenterTabKey = 'history' | 'shortcuts' | 'scripts';

interface Props {
  open: boolean;
  session: StreamSession | null;
  activeTab: SendCenterTabKey;
  onTabChange: (tab: SendCenterTabKey) => void;
  onClose: () => void;
}

function ExpandableItem({
  label,
  sublabel,
  text,
  expanded,
  onToggle,
  onDoubleClick,
  actions,
}: {
  label?: ReactNode;
  sublabel?: string;
  text: string;
  expanded: boolean;
  onToggle: () => void;
  onDoubleClick: () => void;
  actions: ReactNode;
}) {
  return (
    <Box
      className="group"
      rounded="md"
      p="2"
      position="relative"
      bg="bg.subtle"
      borderWidth="1px"
      borderColor="border"
      pb={expanded ? '9' : '2'}
      transition="all 0.2s"
      data-expand-item="true"
      onClick={onToggle}
      onDoubleClick={onDoubleClick}
      cursor="pointer"
    >
      {label && (
        <Flex align="center" justify="space-between" mb={sublabel ? '0.5' : 0}>
          {label}
          {sublabel && (
            <Text fontSize="2xs" color="fg.subtle" fontFamily="mono">
              {sublabel}
            </Text>
          )}
        </Flex>
      )}
      <Text
        fontSize="2xs"
        color="fg.muted"
        fontFamily="mono"
        lineHeight="5"
        overflow="hidden"
        whiteSpace={expanded ? 'pre-wrap' : 'nowrap'}
        textOverflow={expanded ? 'clip' : 'ellipsis'}
        maxH={expanded ? 'none' : '5'}
        pr={expanded ? 0 : '52'}
        className={expanded ? '' : 'group-hover:pr-52'}
      >
        {text}
      </Text>
      <Flex
        position="absolute"
        right="2"
        align="center"
        gap="1"
        px="1.5"
        py="1"
        rounded="md"
        opacity={0}
        pointerEvents="none"
        className="group-hover:opacity-100 group-hover:pointer-events-auto"
        bg="bg.muted"
        borderWidth="1px"
        borderColor="border"
        backdropFilter="blur(2px)"
        top={expanded ? 'auto' : '50%'}
        bottom={expanded ? '2' : 'auto'}
        transform={expanded ? 'none' : 'translateY(-50%)'}
      >
        {actions}
      </Flex>
    </Box>
  );
}

export default function SendCenterDrawer({
  open,
  session,
  activeTab,
  onTabChange,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const quickCommands = useSettingsStore((s) => s.quickCommands);
  const addQuickCommand = useSettingsStore((s) => s.addQuickCommand);
  const removeQuickCommand = useSettingsStore((s) => s.removeQuickCommand);
  const removeSendHistory = useSessionStore((s) => s.removeSendHistory);
  const clearSendHistory = useSessionStore((s) => s.clearSendHistory);

  const [query, setQuery] = useState('');
  const [addingShortcut, setAddingShortcut] = useState(false);
  const [shortcutName, setShortcutName] = useState('');
  const [shortcutData, setShortcutData] = useState('');
  const [shortcutEncoding, setShortcutEncoding] = useState<EncodingMode>('ASCII');
  const [expandedHistoryItem, setExpandedHistoryItem] = useState<string | null>(null);
  const [expandedShortcutId, setExpandedShortcutId] = useState<string | null>(null);

  const collapseExpandedItems = () => {
    setExpandedHistoryItem(null);
    setExpandedShortcutId(null);
  };

  useEffect(() => {
    const onDocPointerDown = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target?.closest('[data-expand-item="true"]')) {
        return;
      }
      collapseExpandedItems();
    };
    document.addEventListener('mousedown', onDocPointerDown);
    return () => document.removeEventListener('mousedown', onDocPointerDown);
  }, []);

  const historyList = useMemo(() => {
    if (!session) {
      return [];
    }
    const q = query.trim().toLowerCase();
    if (!q) {
      return session.sendHistory;
    }
    return session.sendHistory.filter((item) => item.toLowerCase().includes(q));
  }, [session, query]);

  const shortcutList = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return quickCommands;
    }
    return quickCommands.filter(
      (c) => c.name.toLowerCase().includes(q) || c.data.toLowerCase().includes(q),
    );
  }, [quickCommands, query]);

  const fillText = (text: string, sendNow = false, encoding?: EncodingMode) => {
    if (!session) {
      return;
    }
    sendPanelBus.emit(text, encoding ?? session.sendSettings.encoding, sendNow);
  };

  const appendText = (text: string, encoding?: EncodingMode) => {
    if (!session) {
      return;
    }
    sendPanelBus.emit(text, encoding ?? session.sendSettings.encoding, false, true);
  };

  const isStarred = (text: string) => quickCommands.some((c) => c.data === text);

  const toggleStar = (text: string) => {
    const exist = quickCommands.find((c) => c.data === text);
    if (exist) {
      removeQuickCommand(exist.id);
      showToast('info', t('toast.shortcutDeleted'));
      return;
    }
    const shortName =
      text.replace(/\s+/g, ' ').trim().slice(0, 20) || t('sendCenter.shortcutDefaultName');
    addQuickCommand({
      name: shortName,
      data: text,
      encoding: session?.sendSettings.encoding ?? 'ASCII',
    });
    showToast('success', t('toast.shortcutSaved'));
  };

  const startAddShortcut = () => {
    setAddingShortcut(true);
    setShortcutName('');
    setShortcutData(session?.sendContent ?? '');
    setShortcutEncoding(session?.sendSettings.encoding === 'HEX' ? 'HEX' : 'ASCII');
  };

  const saveShortcut = () => {
    if (!shortcutName.trim() || !shortcutData.trim()) {
      return;
    }
    addQuickCommand({
      name: shortcutName.trim(),
      data: shortcutData.trim(),
      encoding: shortcutEncoding,
    });
    showToast('success', t('toast.shortcutSaved'));
    setShortcutName('');
    setShortcutData('');
    setAddingShortcut(false);
  };

  const tabItems = [
    { value: 'history', label: t('sendCenter.tabs.history') },
    { value: 'shortcuts', label: t('sendCenter.tabs.shortcuts') },
    { value: 'scripts', label: t('sendCenter.tabs.scripts') },
  ];

  return (
    <Flex
      direction="column"
      height="full"
      width="340px"
      bg="bg.panel"
      borderLeftWidth="1px"
      borderColor="border"
      transform={open ? 'translateX(0)' : 'translateX(100%)'}
      transition="transform 0.2s ease-out"
    >
      <Flex
        px="3"
        py="2"
        align="center"
        justify="space-between"
        flexShrink={0}
        borderBottomWidth="1px"
        borderColor="border"
        bgGradient="to-r"
        gradientFrom="accent.subtle"
        gradientTo="transparent"
      >
        <Text fontSize="xs" fontWeight="bold" color="accent">
          {t('sendCenter.title')}
        </Text>
        <CloseButton size="sm" onClick={onClose} aria-label={t('header.close')} />
      </Flex>

      <Box p="2" flexShrink={0} borderBottomWidth="1px" borderColor="border">
        <SegmentGroup.Root
          value={activeTab}
          onValueChange={(details) => onTabChange(details.value as SendCenterTabKey)}
          size="sm"
          width="full"
        >
          <SegmentGroup.Indicator />
          <SegmentGroup.Items items={tabItems} flex="1" fontSize="2xs" />
        </SegmentGroup.Root>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('sendCenter.searchPlaceholder')}
          size="sm"
          mt="2"
          height="30px"
          fontSize="2xs"
        />
      </Box>

      <Box flex="1" minH="0" overflowY="auto" p="2" className="sidebar-scroll">
        {activeTab === 'history' && (
          <>
            <Flex align="center" justify="space-between" mb="2">
              <Text fontSize="2xs" color="fg.subtle">
                {t('sendCenter.historyCount', { count: historyList.length })}
              </Text>
              {!!session?.sendHistory.length && (
                <Button
                  variant="ghost"
                  size="xs"
                  color="fg.subtle"
                  onClick={() => {
                    if (session) {
                      clearSendHistory(session.id);
                      showToast('info', t('toast.historyCleared'));
                    }
                  }}
                >
                  {t('sendCenter.clearAll')}
                </Button>
              )}
            </Flex>
            {historyList.length === 0 ? (
              <Text fontSize="2xs" color="fg.subtle" textAlign="center" pt="4">
                {t('sendCenter.emptyHistory')}
              </Text>
            ) : (
              <Stack gap="1.5">
                {historyList.map((item, idx) => {
                  const starred = isStarred(item);
                  const expanded = expandedHistoryItem === item;
                  return (
                    <ExpandableItem
                      key={`${idx}-${item}`}
                      text={item}
                      expanded={expanded}
                      onToggle={() =>
                        setExpandedHistoryItem((prev) => (prev === item ? null : item))
                      }
                      onDoubleClick={() => appendText(item)}
                      actions={
                        <>
                          <Button
                            size="xs"
                            variant="ghost"
                            color="accent"
                            onClick={(e) => {
                              e.stopPropagation();
                              fillText(item);
                            }}
                          >
                            {t('sendCenter.fill')}
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            color="success"
                            onClick={(e) => {
                              e.stopPropagation();
                              fillText(item, true);
                            }}
                          >
                            {t('sendCenter.sendNow')}
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            color={starred ? 'warning' : 'fg.subtle'}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStar(item);
                            }}
                          >
                            {starred ? t('sendCenter.unstar') : t('sendCenter.star')}
                          </Button>
                          {session && (
                            <Button
                              size="xs"
                              variant="ghost"
                              color="fg.subtle"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSendHistory(session.id, item);
                              }}
                            >
                              {t('sendCenter.delete')}
                            </Button>
                          )}
                        </>
                      }
                    />
                  );
                })}
              </Stack>
            )}
          </>
        )}

        {activeTab === 'shortcuts' && (
          <>
            <Flex justify="flex-end" mb="2">
              {!addingShortcut && (
                <Button size="xs" variant="ghost" color="accent" onClick={startAddShortcut}>
                  + {t('shortcuts.add')}
                </Button>
              )}
            </Flex>

            {addingShortcut && (
              <Box
                rounded="md"
                p="2"
                mb="2"
                bg="bg.subtle"
                borderWidth="1px"
                borderColor="accent.subtle"
              >
                <Input
                  value={shortcutName}
                  onChange={(e) => setShortcutName(e.target.value)}
                  placeholder={t('shortcuts.namePlaceholder')}
                  size="sm"
                  mb="1.5"
                  fontSize="2xs"
                />
                <Textarea
                  value={shortcutData}
                  onChange={(e) => setShortcutData(e.target.value)}
                  placeholder={t('shortcuts.dataPlaceholder')}
                  rows={3}
                  fontSize="2xs"
                  fontFamily="mono"
                  resize="y"
                  minH="72px"
                />
                <Flex align="center" gap="2" mt="2">
                  <FieldSelect
                    flex="1"
                    value={shortcutEncoding}
                    onChange={(v) => setShortcutEncoding(v as EncodingMode)}
                    options={[
                      { value: 'ASCII', label: 'ASCII' },
                      { value: 'HEX', label: 'HEX' },
                    ]}
                    fontSize="2xs"
                  />
                  <Button size="xs" color="accent" variant="ghost" onClick={saveShortcut}>
                    {t('shortcuts.save')}
                  </Button>
                  <CloseButton size="xs" onClick={() => setAddingShortcut(false)} />
                </Flex>
              </Box>
            )}

            {shortcutList.length === 0 ? (
              <Text fontSize="2xs" color="fg.subtle" textAlign="center" pt="4">
                {t('sendCenter.emptyShortcuts')}
              </Text>
            ) : (
              <Stack gap="1.5">
                {shortcutList.map((cmd) => (
                  <ExpandableItem
                    key={cmd.id}
                    label={<Text fontSize="2xs" color="accent">{cmd.name}</Text>}
                    sublabel={cmd.encoding}
                    text={cmd.data}
                    expanded={expandedShortcutId === cmd.id}
                    onToggle={() =>
                      setExpandedShortcutId((prev) => (prev === cmd.id ? null : cmd.id))
                    }
                    onDoubleClick={() => appendText(cmd.data, cmd.encoding)}
                    actions={
                      <>
                        <Button
                          size="xs"
                          variant="ghost"
                          color="accent"
                          onClick={(e) => {
                            e.stopPropagation();
                            fillText(cmd.data, false, cmd.encoding);
                          }}
                        >
                          {t('sendCenter.fill')}
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          color="success"
                          onClick={(e) => {
                            e.stopPropagation();
                            fillText(cmd.data, true, cmd.encoding);
                          }}
                        >
                          {t('sendCenter.sendNow')}
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          color="fg.subtle"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeQuickCommand(cmd.id);
                            showToast('info', t('toast.shortcutDeleted'));
                          }}
                        >
                          {t('sendCenter.delete')}
                        </Button>
                      </>
                    }
                  />
                ))}
              </Stack>
            )}
          </>
        )}

        {activeTab === 'scripts' && <ScriptsPanel sessionId={session?.id} />}
      </Box>
    </Flex>
  );
}
