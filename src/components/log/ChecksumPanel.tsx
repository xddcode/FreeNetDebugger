import { useState, useMemo } from 'react';
import { PanelCard, PanelHeader, FieldSelect } from '../sidebar/ui';
import { calculateChecksum } from '../../utils/checksum';
import type { ChecksumType } from '../../types';

const ALGORITHMS: { value: ChecksumType; label: string }[] = [
  { value: 'CRC8', label: 'CRC-8' },
  { value: 'CRC16', label: 'CRC-16 Modbus' },
  { value: 'CRC32', label: 'CRC-32' },
  { value: 'LRC', label: 'LRC' },
  { value: 'XOR', label: 'XOR' },
  { value: 'SUM8', label: 'SUM-8' },
];

export default function ChecksumPanel() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'HEX' | 'ASCII'>('HEX');
  const [algorithm, setAlgorithm] = useState<ChecksumType>('CRC16');

  const result = useMemo(() => {
    if (!input.trim()) { return null; }
    let bytes: number[];
    if (mode === 'HEX') {
      const cleaned = input.replace(/\s/g, '');
      if (!/^[0-9A-Fa-f]*$/.test(cleaned) || cleaned.length % 2 !== 0) {
        return null;
      }
      bytes = [];
      for (let i = 0; i < cleaned.length; i += 2) {
        bytes.push(parseInt(cleaned.slice(i, i + 2), 16));
      }
    } else {
      bytes = Array.from(new TextEncoder().encode(input));
    }
    if (bytes.length === 0) { return null; }
    const value = calculateChecksum(bytes, algorithm);
    const hex = typeof value === 'bigint'
      ? (value as bigint).toString(16).toUpperCase().padStart(8, '0')
      : value.toString(16).toUpperCase().padStart(value > 0xff ? 4 : 2, '0');
    return { value, hex, bytes: bytes.length };
  }, [input, mode, algorithm]);

  return (
    <PanelCard>
      <PanelHeader
        icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M9 9h6v6H9z" />
        </svg>}
        label="Checksum"
      />
      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="flex rounded overflow-hidden border border-[var(--color-border)]">
            {(['HEX', 'ASCII'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-2 py-1 text-[10px] btn-interactive font-[family-name:var(--font-mono)] ${
                  mode === m
                    ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                    : 'text-[var(--color-text-muted)]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <FieldSelect
            value={algorithm}
            onChange={(v) => setAlgorithm(v as ChecksumType)}
            options={ALGORITHMS}
          />
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'HEX' ? '01 02 FF ...' : 'Enter text...'}
          rows={3}
          className="field-control w-full resize-none text-[11px] font-[family-name:var(--font-mono)]"
        />

        {result ? (
          <div className="flex items-center gap-3 px-3 py-2 rounded bg-[var(--color-bg)] border border-[var(--color-border)]">
            <div className="flex-1">
              <div className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)]">Result</div>
              <div className="text-[14px] font-bold font-[family-name:var(--font-mono)] text-[var(--color-primary)]">
                0x{result.hex}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)]">Decimal</div>
              <div className="text-[11px] font-[family-name:var(--font-mono)] text-[var(--color-text-secondary)]">
                {result.value.toString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)]">Bytes</div>
              <div className="text-[11px] font-[family-name:var(--font-mono)] text-[var(--color-text-secondary)]">
                {result.bytes}
              </div>
            </div>
          </div>
        ) : input.trim() ? (
          <div className="text-[10px] text-[var(--color-error)]">Invalid {mode} input</div>
        ) : null}
      </div>
    </PanelCard>
  );
}
