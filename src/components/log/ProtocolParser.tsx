import { useState, useMemo } from 'react';
import { PanelCard, PanelHeader } from '../sidebar/ui';

export type FieldType = 'uint8' | 'uint16' | 'uint32' | 'int8' | 'int16' | 'int32' | 'float' | 'double' | 'ascii' | 'hex';

export interface ProtocolField {
  id: string;
  name: string;
  offset: number;
  length: number;
  type: FieldType;
}

export interface ProtocolTemplate {
  id: string;
  name: string;
  fields: ProtocolField[];
}

interface Props {
  data: number[];
}

const TYPE_SIZES: Record<FieldType, number | null> = {
  uint8: 1, uint16: 2, uint32: 4,
  int8: 1, int16: 2, int32: 4,
  float: 4, double: 8,
  ascii: null, hex: null,
};

function parseField(bytes: number[], field: ProtocolField): string {
  const slice = bytes.slice(field.offset, field.offset + field.length);
  if (slice.length === 0) {return '—';}

  const u8 = (i: number): number => slice[i] ?? 0;

  switch (field.type) {
    case 'uint8': return u8(0).toString();
    case 'uint16': {
      if (slice.length < 2) {return '—';}
      return ((u8(0) << 8) | u8(1)).toString();
    }
    case 'uint32': {
      if (slice.length < 4) {return '—';}
      return ((u8(0) << 24) | (u8(1) << 16) | (u8(2) << 8) | u8(3)).toString();
    }
    case 'int8': {
      const b = u8(0);
      return (b | (b & 0x80 ? ~0x7f : 0)).toString();
    }
    case 'int16': {
      if (slice.length < 2) {return '—';}
      const v = (u8(0) << 8) | u8(1);
      return (v | (v & 0x8000 ? ~0x7fff : 0)).toString();
    }
    case 'int32': {
      if (slice.length < 4) {return '—';}
      const v = (u8(0) << 24) | (u8(1) << 16) | (u8(2) << 8) | u8(3);
      return (v | (v & 0x80000000 ? ~0x7fffffff : 0)).toString();
    }
    case 'float': {
      if (slice.length < 4) {return '—';}
      const buf = new ArrayBuffer(4);
      new Uint8Array(buf).set(slice.slice(0, 4));
      const arr = new Float32Array(buf);
      return arr.length > 0 ? arr[0].toString() : '—';
    }
    case 'double': {
      if (slice.length < 8) {return '—';}
      const buf = new ArrayBuffer(8);
      new Uint8Array(buf).set(slice.slice(0, 8));
      const arr = new Float64Array(buf);
      return arr.length > 0 ? arr[0].toString() : '—';
    }
    case 'ascii':
      return slice.map(b => String.fromCharCode(b)).join('');
    case 'hex':
      return slice.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    default:
      return '—';
  }
}

export default function ProtocolParser({ data }: Props) {
  const [fields, setFields] = useState<ProtocolField[]>([]);
  const [editing, setEditing] = useState(false);
  const [newField, setNewField] = useState<Partial<ProtocolField>>({ type: 'uint8', length: 1 });

  const parsed = useMemo(() => {
    return fields.map(f => ({
      ...f,
      value: parseField(data, f),
      raw: data.slice(f.offset, f.offset + f.length).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' '),
    }));
  }, [fields, data]);

  const addField = () => {
    if (!newField.name || newField.offset === undefined) {return;}
    const length = newField.length ?? TYPE_SIZES[newField.type as FieldType] ?? 1;
    const name = newField.name;
    const offset = newField.offset;
    const type = newField.type as FieldType;
    setFields(prev => [...prev, {
      id: `fld_${Date.now()}`,
      name,
      offset,
      length,
      type,
    }]);
    setNewField({ type: 'uint8', length: 1 });
  };

  const removeField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
  };

  return (
    <PanelCard>
      <PanelHeader
        icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg>}
        label="Protocol Parser"
      />
      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setEditing(!editing)}
            className="text-[10px] btn-interactive text-[var(--color-primary)] border border-[var(--color-primary)]/20 px-2 py-1 rounded"
          >
            {editing ? 'Done' : 'Edit Fields'}
          </button>
          {fields.length > 0 && (
            <span className="text-[10px] text-[var(--color-text-muted)]">{fields.length} fields</span>
          )}
        </div>

        {editing && (
          <div className="flex flex-col gap-1.5 p-2 rounded bg-[var(--color-bg)] border border-[var(--color-border)]">
            <div className="grid grid-cols-4 gap-1">
              <input
                type="text"
                value={newField.name ?? ''}
                onChange={e => setNewField(p => ({ ...p, name: e.target.value }))}
                placeholder="Name"
                className="field-control text-[10px] px-1 py-0.5"
              />
              <input
                type="number"
                value={newField.offset ?? ''}
                onChange={e => setNewField(p => ({ ...p, offset: Number(e.target.value) }))}
                placeholder="Offset"
                className="field-control text-[10px] px-1 py-0.5"
              />
              <input
                type="number"
                value={newField.length ?? ''}
                onChange={e => setNewField(p => ({ ...p, length: Number(e.target.value) }))}
                placeholder="Len"
                className="field-control text-[10px] px-1 py-0.5"
              />
              <select
                value={newField.type ?? 'uint8'}
                onChange={e => setNewField(p => ({ ...p, type: e.target.value as FieldType }))}
                className="field-control text-[10px] px-1 py-0.5"
              >
                <option value="uint8">uint8</option>
                <option value="uint16">uint16</option>
                <option value="uint32">uint32</option>
                <option value="int8">int8</option>
                <option value="int16">int16</option>
                <option value="int32">int32</option>
                <option value="float">float</option>
                <option value="double">double</option>
                <option value="ascii">ascii</option>
                <option value="hex">hex</option>
              </select>
            </div>
            <button
              onClick={addField}
              className="text-[10px] btn-interactive text-[var(--color-success)] border border-[var(--color-success)]/20 px-2 py-0.5 rounded self-start"
            >
              + Add Field
            </button>
          </div>
        )}

        {parsed.length === 0 ? (
          <div className="text-[11px] text-[var(--color-text-muted)]">No fields defined. Click "Edit Fields" to add.</div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="grid grid-cols-[1fr_60px_1fr_1fr_20px] gap-1 px-2 py-1 text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] font-[family-name:var(--font-display)]">
              <span>Name</span>
              <span>Off</span>
              <span>Value</span>
              <span>Raw</span>
              <span />
            </div>
            {parsed.map(f => (
              <div key={f.id} className="grid grid-cols-[1fr_60px_1fr_1fr_20px] gap-1 px-2 py-1 rounded bg-[var(--color-bg)] border border-[var(--color-border)] items-center">
                <span className="text-[10px] font-[family-name:var(--font-mono)] text-[var(--color-text-primary)] truncate" title={f.name}>{f.name}</span>
                <span className="text-[10px] font-[family-name:var(--font-mono)] text-[var(--color-text-muted)]">{f.offset}+{f.length}</span>
                <span className="text-[10px] font-[family-name:var(--font-mono)] text-[var(--color-primary)]">{f.value}</span>
                <span className="text-[10px] font-[family-name:var(--font-mono)] text-[var(--color-text-secondary)] truncate">{f.raw}</span>
                {editing && (
                  <button
                    onClick={() => removeField(f.id)}
                    className="text-[var(--color-error)]/70 hover:text-[var(--color-error)] text-xs btn-interactive"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PanelCard>
  );
}
