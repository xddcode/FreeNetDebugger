import { useState, useMemo } from 'react';
import { Box, Input, Stack } from '@chakra-ui/react';
import { PanelCard, PanelHeader } from '../sidebar/ui';

interface Props {
  data: string;
}

function JsonNode({ keyName, value, depth = 0 }: { keyName?: string; value: unknown; depth?: number }) {
  const [collapsed, setCollapsed] = useState(depth > 2);
  const indent = '  '.repeat(depth);

  if (value === null) {
    return (
      <div className="font-[family-name:var(--font-mono)] text-2xs">
        {indent}{keyName !== undefined ? <span className="text-[var(--color-text-secondary)]">{keyName}: </span> : null}
        <span className="text-[var(--color-error)]">null</span>
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <div className="font-[family-name:var(--font-mono)] text-2xs">
        {indent}{keyName !== undefined ? <span className="text-[var(--color-text-secondary)]">{keyName}: </span> : null}
        <span className="text-[var(--color-secondary)]">{value ? 'true' : 'false'}</span>
      </div>
    );
  }

  if (typeof value === 'number') {
    return (
      <div className="font-[family-name:var(--font-mono)] text-2xs">
        {indent}{keyName !== undefined ? <span className="text-[var(--color-text-secondary)]">{keyName}: </span> : null}
        <span className="text-[var(--color-primary)]">{value}</span>
      </div>
    );
  }

  if (typeof value === 'string') {
    const text = value as string;
    const isUrl = /^https?:\/\//.test(text);
    const display = text.length > 200 ? text.slice(0, 200) + '…' : text;
    return (
      <div className="font-[family-name:var(--font-mono)] text-2xs">
        {indent}{keyName !== undefined ? <span className="text-[var(--color-text-secondary)]">{keyName}: </span> : null}
        <span className={isUrl ? 'text-[var(--color-success)] underline cursor-pointer' : 'text-[var(--color-accent)]'}>
          "{display}"
        </span>
      </div>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <div className="font-[family-name:var(--font-mono)] text-2xs">
          {indent}{keyName !== undefined ? <span className="text-[var(--color-text-secondary)]">{keyName}: </span> : null}[]
        </div>
      );
    }
    return (
      <div>
        <div className="font-[family-name:var(--font-mono)] text-2xs cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
          {indent}{keyName !== undefined ? <span className="text-[var(--color-text-secondary)]">{keyName}: </span> : null}
          <span className="text-[var(--color-text-muted)]">{collapsed ? `[...] ${value.length} items` : '['}</span>
        </div>
        {!collapsed && (
          <>
            {value.map((item, i) => (
              <JsonNode key={i} value={item} depth={depth + 1} />
            ))}
            <div className="font-[family-name:var(--font-mono)] text-2xs text-[var(--color-text-muted)]">{indent}]</div>
          </>
        )}
      </div>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return (
        <div className="font-[family-name:var(--font-mono)] text-2xs">
          {indent}{keyName !== undefined ? <span className="text-[var(--color-text-secondary)]">{keyName}: </span> : null}{}
        </div>
      );
    }
    return (
      <div>
        <div className="font-[family-name:var(--font-mono)] text-2xs cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
          {indent}{keyName !== undefined ? <span className="text-[var(--color-text-secondary)]">{keyName}: </span> : null}
          <span className="text-[var(--color-text-muted)]">{collapsed ? `{...} ${entries.length} keys` : '{'}</span>
        </div>
        {!collapsed && (
          <>
            {entries.map(([k, v]) => (
              <JsonNode key={k} keyName={k} value={v} depth={depth + 1} />
            ))}
            <div className="font-[family-name:var(--font-mono)] text-2xs text-[var(--color-text-muted)]">{indent}{'}'}</div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="font-[family-name:var(--font-mono)] text-2xs">
      {indent}{keyName !== undefined ? <span className="text-[var(--color-text-secondary)]">{keyName}: </span> : null}
      <span className="text-[var(--color-text-muted)]">{String(value)}</span>
    </div>
  );
}

export default function JsonViewer({ data }: Props) {
  const [search, setSearch] = useState('');

  const parsed = useMemo(() => {
    try {
      return JSON.parse(data) as unknown;
    } catch {
      return null;
    }
  }, [data]);

  const filteredData = useMemo(() => {
    if (!search.trim() || !parsed) { return parsed; }
    const q = search.toLowerCase();
    function filter(obj: unknown): unknown {
      if (obj === null || typeof obj !== 'object') {
        return String(obj).toLowerCase().includes(q) ? obj : undefined;
      }
      if (Array.isArray(obj)) {
        const arr = obj.map(filter).filter((v) => v !== undefined);
        return arr.length > 0 ? arr : undefined;
      }
      const entries = Object.entries(obj as Record<string, unknown>)
        .map(([k, v]) => {
          if (k.toLowerCase().includes(q)) { return [k, v] as [string, unknown]; }
          const fv = filter(v);
          return fv !== undefined ? [k, fv] as [string, unknown] : undefined;
        })
        .filter((e): e is [string, unknown] => e !== undefined);
      return entries.length > 0 ? Object.fromEntries(entries) : undefined;
    }
    return filter(parsed);
  }, [parsed, search]);

  if (!parsed) {
    return (
      <PanelCard>
        <PanelHeader
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
          label="JSON"
        />
        <div className="p-3 text-2xs text-[var(--color-text-muted)]">Invalid JSON</div>
      </PanelCard>
    );
  }

  return (
    <PanelCard>
      <PanelHeader
        icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
        label="JSON"
      />
      <Stack p="3" gap="2">
        <Input
          size="xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search keys/values..."
          fontSize="2xs"
        />
        <Box
          maxH="300px"
          overflowY="auto"
          className="sidebar-scroll"
          bg="bg.muted"
          rounded="md"
          p="2"
          borderWidth="1px"
          borderColor="border"
        >
          {filteredData !== undefined ? (
            <JsonNode value={filteredData} />
          ) : (
            <div className="text-2xs text-[var(--color-text-muted)]">No matches</div>
          )}
        </Box>
      </Stack>
    </PanelCard>
  );
}
