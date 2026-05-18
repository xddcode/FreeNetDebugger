import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store';
import { sendPanelBus } from '../../utils/sendPanelBus';
import type { EncodingMode, Session } from '../../types';

export type SendCenterTabKey = 'history' | 'shortcuts' | 'scripts';

interface Props {
  open: boolean;
  session: Session | null;
  activeTab: SendCenterTabKey;
  onTabChange: (tab: SendCenterTabKey) => void;
  onClose: () => void;
}

export default function SendCenterDrawer({ open, session, activeTab, onTabChange, onClose }: Props) {
  const { t } = useTranslation();
  const quickCommands = useAppStore(s => s.quickCommands);
  const addQuickCommand = useAppStore(s => s.addQuickCommand);
  const removeQuickCommand = useAppStore(s => s.removeQuickCommand);
  const removeSendHistory = useAppStore(s => s.removeSendHistory);
  const clearSendHistory = useAppStore(s => s.clearSendHistory);

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
    return session.sendHistory.filter(item => item.toLowerCase().includes(q));
  }, [session, query]);

  const shortcutList = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return quickCommands;
    }
    return quickCommands.filter(c =>
      c.name.toLowerCase().includes(q) || c.data.toLowerCase().includes(q),
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

  const isStarred = (text: string) => quickCommands.some(c => c.data === text);

  const toggleStar = (text: string) => {
    const exist = quickCommands.find(c => c.data === text);
    if (exist) {
      removeQuickCommand(exist.id);
      return;
    }
    const shortName = text.replace(/\s+/g, ' ').trim().slice(0, 20) || t('sendCenter.shortcutDefaultName');
    addQuickCommand({
      name: shortName,
      data: text,
      encoding: session?.sendSettings.encoding ?? 'ASCII',
    });
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
    setShortcutName('');
    setShortcutData('');
    setAddingShortcut(false);
  };

  return (
    <div
      className={`h-full flex flex-col w-[340px] bg-[rgba(16,34,34,0.95)] border-l border-[var(--color-primary)]/20 transition-transform duration-200 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
    >
      <div className="px-3 py-2 flex items-center justify-between shrink-0 border-b border-[var(--color-primary)]/20 bg-[linear-gradient(to_right,rgba(255,0,255,0.08),transparent)]">
        <div className="text-xs font-bold text-[var(--color-primary)] font-[family-name:var(--font-display)]">
          {t('sendCenter.title')}
        </div>
        <button onClick={onClose} className="btn-interactive hover-text-primary focus-ring p-1 -m-1 text-[var(--color-text-muted)] text-[15px]" aria-label={t('header.close')}>×</button>
      </div>

      <div className="p-2 shrink-0 border-b border-[var(--color-primary)]/10">
        <div className="flex items-center gap-1 rounded p-1 bg-[rgba(15,23,42,0.45)] border border-[var(--color-primary)]/15">
          {(['history', 'shortcuts', 'scripts'] as SendCenterTabKey[]).map(k => {
            const active = activeTab === k;
            return (
              <button
                key={k}
                onClick={() => onTabChange(k)}
                className={`flex-1 rounded py-1 btn-interactive focus-ring text-[11px] font-[family-name:var(--font-display)] cursor-pointer ${active ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/12 border border-[var(--color-primary)]/35' : 'text-[var(--color-text-muted)] bg-transparent border border-transparent'}`}
              >
                {t(`sendCenter.tabs.${k}`)}
              </button>
            );
          })}
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('sendCenter.searchPlaceholder')}
          className="field-control w-full mt-2 h-[30px] text-[11px]"
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {activeTab === 'history' && (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[var(--color-text-muted)]">{t('sendCenter.historyCount', { count: historyList.length })}</span>
              {!!session?.sendHistory.length && (
                <button
                  onClick={() => session && clearSendHistory(session.id)}
                  className="btn-interactive hover-text-primary focus-ring text-[10px] text-[var(--color-text-muted)]"
                >
                  {t('sendCenter.clearAll')}
                </button>
              )}
            </div>
            {historyList.length === 0 ? (
              <div className="text-[var(--color-text-muted)] text-[11px] text-center pt-4">{t('sendCenter.emptyHistory')}</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {historyList.map((item, idx) => {
                  const starred = isStarred(item);
                  const expanded = expandedHistoryItem === item;
                  return (
                    <div
                      key={`${idx}-${item}`}
                      className={`rounded p-2 group relative transition-all duration-200 ease-out bg-[rgba(16,34,34,0.7)] border border-[var(--color-primary)]/10 ${expanded ? 'pb-9' : ''}`}
                      data-expand-item="true"
                      onClick={() => setExpandedHistoryItem(prev => (prev === item ? null : item))}
                      onDoubleClick={() => appendText(item)}
                    >
                      <div
                        className={`transition-[max-height,padding-right] duration-200 ease-out text-[11px] text-[var(--color-text-secondary)] font-[family-name:var(--font-mono)] leading-5 overflow-hidden ${expanded ? 'whitespace-pre-wrap break-all max-h-[9999px] text-clip' : 'whitespace-nowrap break-normal max-h-5 text-ellipsis group-hover:pr-52 group-focus-within:pr-52'}`}
                      >
                        {item}
                      </div>
                      <div
                        className={`absolute right-2 flex items-center gap-1 px-1.5 py-1 rounded-md opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-all bg-[rgba(31,41,55,0.92)] border border-[var(--color-text-muted)]/18 backdrop-blur-[2px] ${
                          expanded ? 'bottom-2' : 'top-1/2 -translate-y-1/2'
                        }`}
                      >
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            fillText(item);
                          }}
                          title={t('sendCenter.fill')}
                          aria-label={t('sendCenter.fill')}
                          className="btn-interactive hover:opacity-80 focus-ring text-[var(--color-primary)] text-[10px] font-semibold"
                        >
                          {t('sendCenter.fill')}
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            fillText(item, true);
                          }}
                          title={t('sendCenter.sendNow')}
                          aria-label={t('sendCenter.sendNow')}
                          className="btn-interactive hover:opacity-80 focus-ring text-[var(--color-secondary)] text-[10px] font-semibold"
                        >
                          {t('sendCenter.sendNow')}
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            toggleStar(item);
                          }}
                          title={starred ? t('sendCenter.unstar') : t('sendCenter.star')}
                          aria-label={starred ? t('sendCenter.unstar') : t('sendCenter.star')}
                          className={`btn-interactive hover:opacity-80 focus-ring text-[10px] font-semibold ${starred ? 'text-amber-400' : 'text-[var(--color-text-muted)]'}`}
                        >
                          {starred ? t('sendCenter.unstar') : t('sendCenter.star')}
                        </button>
                        {session && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              removeSendHistory(session.id, item);
                            }}
                            title={t('sendCenter.delete')}
                            aria-label={t('sendCenter.delete')}
                            className="btn-interactive hover:opacity-80 focus-ring text-[var(--color-text-muted)] text-[10px] font-semibold"
                          >
                            {t('sendCenter.delete')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'shortcuts' && (
          <>
            <div className="flex items-center justify-end mb-2">
              {!addingShortcut && (
                <button
                  onClick={startAddShortcut}
                  className="btn-interactive hover:opacity-90 focus-ring text-[10px] text-[var(--color-secondary)]"
                >
                  + {t('shortcuts.add')}
                </button>
              )}
            </div>

            {addingShortcut && (
              <div
                className="rounded p-2 mb-2 bg-[rgba(16,34,34,0.7)] border border-[var(--color-secondary)]/20"
              >
                <input
                  value={shortcutName}
                  onChange={e => setShortcutName(e.target.value)}
                  placeholder={t('shortcuts.namePlaceholder')}
                  className="field-control w-full h-[28px] text-[11px]"
                />
                <textarea
                  value={shortcutData}
                  onChange={e => setShortcutData(e.target.value)}
                  placeholder={t('shortcuts.dataPlaceholder')}
                  rows={3}
                  className="field-control mt-1.5 w-full resize-y min-h-[72px]"
                />
                <div className="flex items-center gap-2 mt-2">
                  <select
                    value={shortcutEncoding}
                    onChange={e => setShortcutEncoding(e.target.value as EncodingMode)}
                    className="field-control h-[26px] text-[10px] flex-1"
                  >
                    <option value="ASCII">ASCII</option>
                    <option value="HEX">HEX</option>
                  </select>
                  <button onClick={saveShortcut} className="btn-interactive hover:opacity-90 focus-ring text-[10px] text-[var(--color-primary)]">{t('shortcuts.save')}</button>
                  <button onClick={() => setAddingShortcut(false)} className="btn-interactive hover-text-primary focus-ring text-[10px] text-[var(--color-text-muted)]">✕</button>
                </div>
              </div>
            )}

            {shortcutList.length === 0 ? (
              <div className="text-[var(--color-text-muted)] text-[11px] text-center pt-4">{t('sendCenter.emptyShortcuts')}</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {shortcutList.map(cmd => (
                  <div
                    key={cmd.id}
                    className={`rounded p-2 group relative transition-all duration-200 ease-out bg-[rgba(16,34,34,0.7)] border border-[var(--color-primary)]/10 ${expandedShortcutId === cmd.id ? 'pb-9' : ''}`}
                    data-expand-item="true"
                    onClick={() => setExpandedShortcutId(prev => (prev === cmd.id ? null : cmd.id))}
                    onDoubleClick={() => appendText(cmd.data, cmd.encoding)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[var(--color-primary)]">{cmd.name}</span>
                      <span className="text-[9px] text-[var(--color-text-muted)] font-[family-name:var(--font-mono)]">{cmd.encoding}</span>
                    </div>
                    <div
                      className={`transition-[max-height,padding-right] duration-200 ease-out text-[11px] text-[var(--color-text-secondary)] font-[family-name:var(--font-mono)] leading-5 overflow-hidden mt-0.5 ${expandedShortcutId === cmd.id ? 'whitespace-pre-wrap break-all max-h-[9999px] text-clip' : 'whitespace-nowrap break-normal max-h-5 text-ellipsis group-hover:pr-40 group-focus-within:pr-40'}`}
                    >
                      {cmd.data}
                    </div>
                    <div
                      className={`absolute right-2 flex items-center gap-1 px-1.5 py-1 rounded-md opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-all bg-[rgba(31,41,55,0.92)] border border-[var(--color-text-muted)]/18 backdrop-blur-[2px] ${
                        expandedShortcutId === cmd.id ? 'bottom-2' : 'top-1/2 -translate-y-1/2'
                      }`}
                    >
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          fillText(cmd.data, false, cmd.encoding);
                        }}
                        title={t('sendCenter.fill')}
                        aria-label={t('sendCenter.fill')}
                        className="btn-interactive hover:opacity-80 focus-ring text-[var(--color-primary)] text-[10px] font-semibold"
                      >
                        {t('sendCenter.fill')}
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          fillText(cmd.data, true, cmd.encoding);
                        }}
                        title={t('sendCenter.sendNow')}
                        aria-label={t('sendCenter.sendNow')}
                        className="btn-interactive hover:opacity-80 focus-ring text-[var(--color-secondary)] text-[10px] font-semibold"
                      >
                        {t('sendCenter.sendNow')}
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          removeQuickCommand(cmd.id);
                        }}
                        title={t('sendCenter.delete')}
                        aria-label={t('sendCenter.delete')}
                        className="btn-interactive hover:opacity-80 focus-ring text-[var(--color-text-muted)] text-[10px] font-semibold"
                      >
                        {t('sendCenter.delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'scripts' && (
          <div className="rounded p-3 bg-[rgba(16,34,34,0.7)] border border-dashed border-[var(--color-primary)]/20">
            <div className="text-[var(--color-primary)] text-[11px] font-bold">{t('sendCenter.scriptsComingSoon')}</div>
            <div className="text-[var(--color-text-muted)] text-[11px] mt-1.5 leading-relaxed">
              {t('sendCenter.scriptsHint')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
