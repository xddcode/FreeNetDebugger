import { useState, useRef, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '../../store';
import type { Session, SessionProfile } from '../../types';
import { PanelCard, PanelHeader } from './ui';

interface Props {
  session: Session;
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ProfilePanel({ session }: Props) {
  const { t } = useTranslation();
  const profiles = useSessionStore(s => s.profiles);
  const saveProfile = useSessionStore(s => s.saveProfile);
  const deleteProfile = useSessionStore(s => s.deleteProfile);
  const applyProfile = useSessionStore(s => s.applyProfile);
  const renameProfile = useSessionStore(s => s.renameProfile);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newName, setNewName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const name = newName.trim() || `${session.config.protocol} ${new Date().toLocaleString()}`;
    saveProfile(session.id, name);
    setNewName('');
  };

  const handleApply = (profileId: string) => {
    applyProfile(profileId, session.id);
  };

  const handleDelete = (profileId: string) => {
    deleteProfile(profileId);
  };

  const startRename = (profile: SessionProfile) => {
    setEditingId(profile.id);
    setEditName(profile.name);
  };

  const commitRename = () => {
    if (editingId) {
      renameProfile(editingId, editName);
      setEditingId(null);
    }
  };

  const handleExport = () => {
    downloadJson(profiles, `fnd-profiles-${Date.now()}.json`);
  };

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { return; }
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const content = ev.target?.result;
        if (typeof content !== 'string') { return; }
        const imported = JSON.parse(content) as SessionProfile[];
        if (!Array.isArray(imported)) { return; }
        for (const p of imported) {
          if (p.id && p.config) {
            // Ensure unique ID to avoid conflicts
            p.id = `prof_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
            saveProfile(session.id, p.name);
            // Overwrite the just-saved profile with imported data
            const store = useSessionStore.getState();
            store.deleteProfile(store.profiles[0].id);
          }
        }
      } catch {
        // ignore invalid files
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <PanelCard>
      <PanelHeader
        icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>}
        label={t('profile.title')}
      />
      <div className="p-3 flex flex-col gap-2">
        {/* Save new profile */}
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder={t('profile.namePlaceholder')}
            className="field-control flex-1 min-w-0 text-[11px] px-2 py-1"
          />
          <button
            onClick={handleSave}
            className="px-2 py-1 text-[10px] btn-interactive focus-ring text-[var(--color-primary)] border border-[var(--color-primary)]/20 rounded font-[family-name:var(--font-mono)]"
          >
            {t('profile.save')}
          </button>
        </div>

        {/* Profile list */}
        {profiles.length === 0 ? (
          <div className="text-[11px] text-[var(--color-text-muted)] font-[family-name:var(--font-mono)] py-1">
            {t('profile.empty')}
          </div>
        ) : (
          <div className="flex flex-col gap-1 max-h-[180px] overflow-y-auto sidebar-scroll">
            {profiles.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--color-bg)] border border-[var(--color-border)] group"
              >
                {editingId === p.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => { if (e.key === 'Enter') { commitRename(); } }}
                    autoFocus
                    className="field-control flex-1 min-w-0 text-[10px] px-1 py-0.5"
                  />
                ) : (
                  <button
                    onClick={() => handleApply(p.id)}
                    className="flex-1 min-w-0 text-left text-[10px] font-[family-name:var(--font-mono)] text-[var(--color-text-primary)] btn-interactive truncate"
                    title={`${p.name} (${p.config.protocol})`}
                  >
                    <span className="text-[var(--color-primary)]">{p.config.protocol}</span>{' '}
                    <span className="text-[var(--color-text-secondary)]">{p.name}</span>
                  </button>
                )}
                <button
                  onClick={() => startRename(p)}
                  className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] text-[10px] px-0.5 btn-interactive transition-opacity"
                  title={t('profile.rename')}
                >
                  ✎
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="opacity-0 group-hover:opacity-100 text-[var(--color-error)]/70 hover:text-[var(--color-error)] text-[10px] px-0.5 btn-interactive transition-opacity"
                  title={t('profile.delete')}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Export / Import */}
        <div className="flex items-center gap-2 pt-1 border-t border-[var(--color-border)]">
          <button
            onClick={handleExport}
            disabled={profiles.length === 0}
            className="flex items-center gap-1 text-[10px] btn-interactive focus-ring text-[var(--color-secondary)] disabled:opacity-50 font-[family-name:var(--font-mono)]"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            {t('profile.export')}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-[10px] btn-interactive focus-ring text-[var(--color-secondary)] font-[family-name:var(--font-mono)]"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            {t('profile.import')}
          </button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>
      </div>
    </PanelCard>
  );
}
