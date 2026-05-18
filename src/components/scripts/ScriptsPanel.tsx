import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Editor from '@monaco-editor/react';
import { useScriptStore } from '../../store';
import type { Script } from '../../types';

interface Props {
  sessionId?: string;
}

export default function ScriptsPanel({ sessionId }: Props) {
  const { t } = useTranslation();
  const scripts = useScriptStore((s) => s.scripts);
  const activeId = useScriptStore((s) => s.activeScriptId);
  const addScript = useScriptStore((s) => s.addScript);
  const removeScript = useScriptStore((s) => s.removeScript);
  const updateScript = useScriptStore((s) => s.updateScript);
  const setActive = useScriptStore((s) => s.setActiveScript);
  const linkToSession = useScriptStore((s) => s.linkToSession);
  const unlinkFromSession = useScriptStore((s) => s.unlinkFromSession);

  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const activeScript = scripts.find((s) => s.id === activeId) ?? null;

  const handleAdd = () => {
    addScript();
  };

  const handleDelete = (id: string) => {
    removeScript(id);
  };

  const handleSourceChange = useCallback(
    (value: string | undefined) => {
      if (activeId && value !== undefined) {
        updateScript(activeId, { source: value });
      }
    },
    [activeId, updateScript]
  );

  const handleToggleAutoRun = (script: Script) => {
    updateScript(script.id, { autoRun: !script.autoRun });
  };

  const handleToggleLink = (script: Script) => {
    if (!sessionId) { return; }
    if (script.linkedSessionIds.includes(sessionId)) {
      unlinkFromSession(script.id, sessionId);
    } else {
      linkToSession(script.id, sessionId);
    }
  };

  const handleRun = () => {
    if (!activeScript) { return; }
    setIsRunning(true);
    setOutput((prev) => [...prev, `> Running "${activeScript.name}"...`]);
    // TODO: invoke backend script execution when backend is ready
    window.setTimeout(() => {
      setIsRunning(false);
      setOutput((prev) => [...prev, '> Script execution not yet implemented in backend.']);
    }, 500);
  };

  const handleStop = () => {
    setIsRunning(false);
    setOutput((prev) => [...prev, '> Stopped.']);
  };

  const clearOutput = () => setOutput([]);

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Script list */}
      <div className="flex items-center gap-1 shrink-0">
        <div className="flex-1 flex items-center gap-1 overflow-x-auto sidebar-scroll">
          {scripts.map((sc) => (
            <button
              key={sc.id}
              onClick={() => setActive(sc.id)}
              className={`px-2 py-1 rounded text-[10px] btn-interactive whitespace-nowrap font-[family-name:var(--font-mono)] ${
                sc.id === activeId
                  ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
              }`}
            >
              {sc.name}
              {sc.autoRun && (
                <span className="ml-1 text-[var(--color-success)]">●</span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={handleAdd}
          className="px-2 py-1 rounded text-[10px] btn-interactive text-[var(--color-primary)] border border-[var(--color-primary)]/20 shrink-0"
        >
          + {t('shortcuts.add')}
        </button>
      </div>

      {activeScript ? (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={isRunning ? handleStop : handleRun}
                disabled={!activeScript}
                className={`px-3 py-1 rounded text-[10px] font-bold uppercase btn-interactive focus-ring font-[family-name:var(--font-display)] ${
                  isRunning
                    ? 'bg-[var(--color-error)]/10 text-[var(--color-error)] border border-[var(--color-error)]/20'
                    : 'bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20'
                }`}
              >
                {isRunning ? 'Stop' : 'Run'}
              </button>
              <label className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeScript.autoRun}
                  onChange={() => handleToggleAutoRun(activeScript)}
                  className="custom-check accent"
                />
                Auto-run
              </label>
              {sessionId && (
                <label className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeScript.linkedSessionIds.includes(sessionId)}
                    onChange={() => handleToggleLink(activeScript)}
                    className="custom-check accent"
                  />
                  Link
                </label>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDelete(activeScript.id)}
                className="text-[10px] btn-interactive text-[var(--color-error)]/70 hover:text-[var(--color-error)]"
              >
                {t('profile.delete')}
              </button>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 min-h-0 rounded border border-[var(--color-border)] overflow-hidden">
            <Editor
              value={activeScript.source}
              onChange={handleSourceChange}
              language="javascript"
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 8 },
              }}
            />
          </div>

          {/* Output */}
          <div className="shrink-0 h-[120px] flex flex-col rounded border border-[var(--color-border)] bg-[rgba(16,34,34,0.7)]">
            <div className="flex items-center justify-between px-2 py-1 border-b border-[var(--color-border)]">
              <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] font-[family-name:var(--font-display)]">Output</span>
              <button
                onClick={clearOutput}
                className="text-[9px] btn-interactive text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
              >
                {t('send.clear')}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-text-secondary)] sidebar-scroll">
              {output.length === 0 ? (
                <span className="text-[var(--color-text-muted)]">Ready...</span>
              ) : (
                output.map((line, i) => (
                  <div key={i} className="leading-relaxed">{line}</div>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[var(--color-text-muted)]">
          <div className="text-[11px]">{t('sendCenter.emptyShortcuts')}</div>
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 rounded text-[10px] btn-interactive text-[var(--color-primary)] border border-[var(--color-primary)]/20"
          >
            + {t('shortcuts.add')}
          </button>
        </div>
      )}
    </div>
  );
}
