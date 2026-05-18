import type { ReactNode } from 'react';

export function PanelCard({ children }: { children: ReactNode }) {
  return <div className="neon-card flex flex-col overflow-hidden shrink-0">{children}</div>;
}

export function PanelHeader({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 shrink-0 bg-[linear-gradient(to_right,rgba(45,212,191,0.1),transparent)] border-b border-[var(--color-primary)]/20"
    >
      <span className="text-[var(--color-primary)] flex items-center">{icon}</span>
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] font-[family-name:var(--font-display)]">{label}</h3>
    </div>
  );
}

export function FieldLabel({ seq, label }: { seq?: number; label: string }) {
  return (
    <label className="block mb-1 uppercase font-bold tracking-wider text-[var(--color-text-muted)] text-[10px]"
    >
      {seq && <span className="text-[var(--color-text-muted)]">({seq}) </span>}{label}
    </label>
  );
}

export function FieldInput({ value, onChange, placeholder, type = 'text', disabled, error }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean; error?: boolean }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} className={`field-control w-full disabled:opacity-50 disabled:cursor-not-allowed ${error ? 'border-[var(--color-error)] !shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_0_0_1px_rgba(251,113,133,0.4)]' : ''}`} />;
}

export function FieldSelect({ value, onChange, options, disabled }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; disabled?: boolean }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className="field-control pr-6 appearance-none cursor-pointer w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <svg width="10" height="10" viewBox="0 0 10 10" className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="rgba(19,236,236,0.5)" strokeWidth="1.5"><polyline points="2,3 5,7 8,3" /></svg>
    </div>
  );
}

export function CheckRow({ checked, onChange, label, accent }: { checked: boolean; onChange: (v: boolean) => void; label: string; accent?: boolean }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input type="checkbox" className={`custom-check ${accent ? 'accent' : ''}`} checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="text-xs transition-colors text-[var(--color-text-secondary)] text-[11px]">{label}</span>
    </label>
  );
}

export function RadioGroup({ options, value, onChange, accent }: { options: string[]; value: string; onChange: (v: string) => void; accent?: boolean }) {
  return (
    <div className="flex items-center gap-4 p-1.5 rounded bg-[rgba(16,34,34,0.5)] border border-[var(--color-primary)]/10"
    >
      {options.map(opt => (
        <label key={opt} className="flex items-center gap-1.5 cursor-pointer select-none"
        >
          <input type="radio" className={`custom-radio ${accent ? 'accent' : ''}`} checked={value === opt} onChange={() => onChange(opt)} />
          <span className="text-[11px] font-[family-name:var(--font-mono)] text-[var(--color-text-secondary)]">{opt}</span>
        </label>
      ))}
    </div>
  );
}
