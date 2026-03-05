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
      className="h-full flex flex-col"
      style={{
        width: 340,
        background: 'rgba(16,34,34,0.95)',
        borderLeft: '1px solid rgba(19,236,236,0.2)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.2s ease',
      }}
    >
      <div className="px-3 py-2 flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid rgba(19,236,236,0.2)', background: 'linear-gradient(to right,rgba(255,0,255,0.08),transparent)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}>
          {t('sendCenter.title')}
        </div>
        <button onClick={onClose} style={{ color: '#64748b', fontSize: 15, cursor: 'pointer' }}>×</button>
      </div>

      <div className="p-2 shrink-0" style={{ borderBottom: '1px solid rgba(19,236,236,0.1)' }}>
        <div className="flex items-center gap-1 rounded p-1" style={{ background: 'rgba(15,23,42,0.45)', border: '1px solid rgba(19,236,236,0.15)' }}>
          {(['history', 'shortcuts', 'scripts'] as SendCenterTabKey[]).map(k => {
            const active = activeTab === k;
            return (
              <button
                key={k}
                onClick={() => onTabChange(k)}
                className="flex-1 rounded py-1"
                style={{
                  fontSize: 11,
                  color: active ? 'var(--color-primary)' : '#64748b',
                  background: active ? 'rgba(19,236,236,0.12)' : 'transparent',
                  border: active ? '1px solid rgba(19,236,236,0.35)' : '1px solid transparent',
                  fontFamily: 'var(--font-display)',
                  cursor: 'pointer',
                }}
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
          className="field-control w-full mt-2"
          style={{ height: 30, fontSize: 11 }}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {activeTab === 'history' && (
          <>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: 10, color: '#64748b' }}>{t('sendCenter.historyCount', { count: historyList.length })}</span>
              {!!session?.sendHistory.length && (
                <button
                  onClick={() => session && clearSendHistory(session.id)}
                  style={{ fontSize: 10, color: '#94a3b8', cursor: 'pointer' }}
                >
                  {t('sendCenter.clearAll')}
                </button>
              )}
            </div>
            {historyList.length === 0 ? (
              <div style={{ color: '#475569', fontSize: 11, textAlign: 'center', paddingTop: 16 }}>{t('sendCenter.emptyHistory')}</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {historyList.map((item, idx) => {
                  const starred = isStarred(item);
                  const expanded = expandedHistoryItem === item;
                  return (
                    <div
                      key={`${idx}-${item}`}
                      className={`rounded p-2 group relative transition-all duration-200 ease-out ${expanded ? 'pb-9' : ''}`}
                      data-expand-item="true"
                      onClick={() => setExpandedHistoryItem(prev => (prev === item ? null : item))}
                      onDoubleClick={() => appendText(item)}
                      style={{ background: 'rgba(16,34,34,0.7)', border: '1px solid rgba(19,236,236,0.1)' }}
                    >
                      <div
                        className={`transition-[max-height,padding-right] duration-200 ease-out ${expanded ? '' : 'group-hover:pr-52 group-focus-within:pr-52'}`}
                        style={{
                          fontSize: 11,
                          color: '#cbd5e1',
                          fontFamily: 'var(--font-mono)',
                          whiteSpace: expanded ? 'pre-wrap' : 'nowrap',
                          wordBreak: expanded ? 'break-all' : 'normal',
                          overflow: 'hidden',
                          textOverflow: expanded ? 'clip' : 'ellipsis',
                          lineHeight: '20px',
                          maxHeight: expanded ? 9999 : 20,
                        }}
                      >
                        {item}
                      </div>
                      <div
                        className={`absolute right-2 flex items-center gap-1 px-1.5 py-1 rounded-md opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-all ${
                          expanded ? 'bottom-2' : 'top-1/2 -translate-y-1/2'
                        }`}
                        style={{ background: 'rgba(31,41,55,0.92)', border: '1px solid rgba(148,163,184,0.18)', backdropFilter: 'blur(2px)' }}
                      >
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            fillText(item);
                          }}
                          title={t('sendCenter.fill')}
                          aria-label={t('sendCenter.fill')}
                          style={{ color: 'var(--color-primary)', cursor: 'pointer', fontSize: 10, fontWeight: 600 }}
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
                          style={{ color: 'var(--color-accent)', cursor: 'pointer', fontSize: 10, fontWeight: 600 }}
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
                          style={{ color: starred ? '#fbbf24' : '#94a3b8', cursor: 'pointer', fontSize: 10, fontWeight: 600 }}
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
                            style={{ color: '#94a3b8', cursor: 'pointer', fontSize: 10, fontWeight: 600 }}
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
                  style={{ fontSize: 10, color: 'var(--color-accent)', cursor: 'pointer' }}
                >
                  + {t('shortcuts.add')}
                </button>
              )}
            </div>

            {addingShortcut && (
              <div
                className="rounded p-2 mb-2"
                style={{ background: 'rgba(16,34,34,0.7)', border: '1px solid rgba(255,0,255,0.2)' }}
              >
                <input
                  value={shortcutName}
                  onChange={e => setShortcutName(e.target.value)}
                  placeholder={t('shortcuts.namePlaceholder')}
                  className="field-control w-full"
                  style={{ height: 28, fontSize: 11 }}
                />
                <textarea
                  value={shortcutData}
                  onChange={e => setShortcutData(e.target.value)}
                  placeholder={t('shortcuts.dataPlaceholder')}
                  rows={3}
                  style={{ width: '100%', marginTop: 6, background: 'var(--color-bg-dark)', border: '1px solid rgba(19,236,236,0.3)', borderRadius: 4, padding: '6px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', outline: 'none', resize: 'vertical' }}
                />
                <div className="flex items-center gap-2 mt-2">
                  <select
                    value={shortcutEncoding}
                    onChange={e => setShortcutEncoding(e.target.value as EncodingMode)}
                    className="field-control"
                    style={{ height: 26, fontSize: 10, flex: 1 }}
                  >
                    <option value="ASCII">ASCII</option>
                    <option value="HEX">HEX</option>
                  </select>
                  <button onClick={saveShortcut} style={{ fontSize: 10, color: 'var(--color-primary)', cursor: 'pointer' }}>{t('shortcuts.save')}</button>
                  <button onClick={() => setAddingShortcut(false)} style={{ fontSize: 10, color: '#64748b', cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            )}

            {shortcutList.length === 0 ? (
              <div style={{ color: '#475569', fontSize: 11, textAlign: 'center', paddingTop: 16 }}>{t('sendCenter.emptyShortcuts')}</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {shortcutList.map(cmd => (
                  <div
                    key={cmd.id}
                    className={`rounded p-2 group relative transition-all duration-200 ease-out ${expandedShortcutId === cmd.id ? 'pb-9' : ''}`}
                    data-expand-item="true"
                    onClick={() => setExpandedShortcutId(prev => (prev === cmd.id ? null : cmd.id))}
                    onDoubleClick={() => appendText(cmd.data, cmd.encoding)}
                    style={{ background: 'rgba(16,34,34,0.7)', border: '1px solid rgba(19,236,236,0.1)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: 10, color: 'var(--color-primary)' }}>{cmd.name}</span>
                      <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'var(--font-mono)' }}>{cmd.encoding}</span>
                    </div>
                    <div
                      className={`transition-[max-height,padding-right] duration-200 ease-out ${expandedShortcutId === cmd.id ? '' : 'group-hover:pr-40 group-focus-within:pr-40'}`}
                      style={{
                        fontSize: 11,
                        color: '#cbd5e1',
                        fontFamily: 'var(--font-mono)',
                        whiteSpace: expandedShortcutId === cmd.id ? 'pre-wrap' : 'nowrap',
                        wordBreak: expandedShortcutId === cmd.id ? 'break-all' : 'normal',
                        overflow: 'hidden',
                        textOverflow: expandedShortcutId === cmd.id ? 'clip' : 'ellipsis',
                        marginTop: 2,
                        lineHeight: '20px',
                        maxHeight: expandedShortcutId === cmd.id ? 9999 : 20,
                      }}
                    >
                      {cmd.data}
                    </div>
                    <div
                      className={`absolute right-2 flex items-center gap-1 px-1.5 py-1 rounded-md opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-all ${
                        expandedShortcutId === cmd.id ? 'bottom-2' : 'top-1/2 -translate-y-1/2'
                      }`}
                      style={{ background: 'rgba(31,41,55,0.92)', border: '1px solid rgba(148,163,184,0.18)', backdropFilter: 'blur(2px)' }}
                    >
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          fillText(cmd.data, false, cmd.encoding);
                        }}
                        title={t('sendCenter.fill')}
                        aria-label={t('sendCenter.fill')}
                        style={{ color: 'var(--color-primary)', cursor: 'pointer', fontSize: 10, fontWeight: 600 }}
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
                        style={{ color: 'var(--color-accent)', cursor: 'pointer', fontSize: 10, fontWeight: 600 }}
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
                        style={{ color: '#94a3b8', cursor: 'pointer', fontSize: 10, fontWeight: 600 }}
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
          <div className="rounded p-3" style={{ background: 'rgba(16,34,34,0.7)', border: '1px dashed rgba(19,236,236,0.2)' }}>
            <div style={{ color: 'var(--color-primary)', fontSize: 11, fontWeight: 700 }}>{t('sendCenter.scriptsComingSoon')}</div>
            <div style={{ color: '#64748b', fontSize: 11, marginTop: 6, lineHeight: 1.4 }}>
              {t('sendCenter.scriptsHint')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
