import { useState } from 'react';
import ChecksumPanel from './ChecksumPanel';
import JsonViewer from './JsonViewer';
import ProtocolParser from './ProtocolParser';

type ToolTab = 'checksum' | 'json' | 'protocol';

export default function DataToolsPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ToolTab>('checksum');
  const [jsonInput, setJsonInput] = useState('');
  const [protocolInput, setProtocolInput] = useState('');

  const parseProtocolBytes = (input: string): number[] => {
    const cleaned = input.replace(/\s/g, '');
    if (!/^[0-9A-Fa-f]*$/.test(cleaned) || cleaned.length % 2 !== 0) {
      return [];
    }
    const bytes: number[] = [];
    for (let i = 0; i < cleaned.length; i += 2) {
      bytes.push(parseInt(cleaned.slice(i, i + 2), 16));
    }
    return bytes;
  };

  return (
    <div className="shrink-0 neon-card overflow-hidden">
      <button
        className={`w-full flex items-center justify-between px-3 py-2 btn-interactive bg-[linear-gradient(to_right,rgba(129,140,248,0.08),transparent)] ${open ? 'border-b border-[var(--color-border)]' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary)]">Data Tools</span>
        </div>
        <svg
          width="12" height="12" viewBox="0 0 12 12"
          fill="none" stroke="var(--color-border-focus)" strokeWidth="1.5"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="2,4 6,8 10,4" />
        </svg>
      </button>

      {open && (
        <div className="p-2 flex flex-col gap-2">
          <div className="flex items-center gap-1 rounded p-1 bg-[rgba(15,23,42,0.45)] border border-[var(--color-primary)]/15">
            {(['checksum', 'json', 'protocol'] as ToolTab[]).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`flex-1 rounded py-1 btn-interactive focus-ring text-[11px] font-[family-name:var(--font-display)] cursor-pointer ${
                  tab === k
                    ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/12 border border-[var(--color-primary)]/35'
                    : 'text-[var(--color-text-muted)] bg-transparent border border-transparent'
                }`}
              >
                {k === 'checksum' && 'Checksum'}
                {k === 'json' && 'JSON'}
                {k === 'protocol' && 'Protocol'}
              </button>
            ))}
          </div>

          {tab === 'checksum' && <ChecksumPanel />}

          {tab === 'json' && (
            <>
              <textarea
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
                placeholder="Paste JSON here..."
                rows={3}
                className="field-control w-full resize-none text-[11px] font-[family-name:var(--font-mono)]"
              />
              <JsonViewer data={jsonInput} />
            </>
          )}

          {tab === 'protocol' && (
            <>
              <textarea
                value={protocolInput}
                onChange={e => setProtocolInput(e.target.value)}
                placeholder="Hex bytes: 01 02 FF ..."
                rows={2}
                className="field-control w-full resize-none text-[11px] font-[family-name:var(--font-mono)]"
              />
              <ProtocolParser data={parseProtocolBytes(protocolInput)} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
