import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Session } from '../../types';
import { PanelCard, PanelHeader } from './ui';

interface Props {
  session: Session;
}

interface ParsedHttpResponse {
  statusCode: number;
  statusText: string;
  elapsedMs: number;
  headers: Record<string, string>;
  bodySize: number;
}

function parseHttpResponse(logs: Session['logs']): ParsedHttpResponse | null {
  // Find the most recent system log that looks like an HTTP response
  for (let i = logs.length - 1; i >= 0; i--) {
    const entry = logs[i];
    if (entry.direction !== 'system') {
      continue;
    }
    const text = new TextDecoder().decode(new Uint8Array(entry.data));
    const match = text.match(/^HTTP\s+(\d{3})\s+(.+)\s*\((\d+)\s*ms\)\n/);
    if (!match) {
      continue;
    }
    const statusCode = parseInt(match[1], 10);
    const statusText = match[2].trim();
    const elapsedMs = parseInt(match[3], 10);
    const headerLines = text.slice(match[0].length).split('\n');
    const headers: Record<string, string> = {};
    for (const line of headerLines) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
      }
    }
    // Find body size from the next recv entry
    let bodySize = 0;
    for (let j = i + 1; j < logs.length; j++) {
      if (logs[j].direction === 'recv') {
        bodySize = logs[j].data.length;
        break;
      }
      if (logs[j].direction === 'system') {
        break;
      }
    }
    return { statusCode, statusText, elapsedMs, headers, bodySize };
  }
  return null;
}

function statusColorClass(code: number): string {
  if (code >= 200 && code < 300) { return 'text-[var(--color-success)]'; }
  if (code >= 300 && code < 400) { return 'text-[var(--color-warning)]'; }
  if (code >= 400 && code < 500) { return 'text-[var(--color-warning)]'; }
  if (code >= 500) { return 'text-[var(--color-error)]'; }
  return 'text-[var(--color-text-muted)]';
}

function statusBgClass(code: number): string {
  if (code >= 200 && code < 300) { return 'bg-[var(--color-success)]/10 border-[var(--color-success)]/20'; }
  if (code >= 300 && code < 400) { return 'bg-[var(--color-warning)]/10 border-[var(--color-warning)]/20'; }
  if (code >= 400 && code < 500) { return 'bg-[var(--color-warning)]/10 border-[var(--color-warning)]/20'; }
  if (code >= 500) { return 'bg-[var(--color-error)]/10 border-[var(--color-error)]/20'; }
  return 'bg-[var(--color-surface)] border-[var(--color-border-subtle)]';
}

export default function HttpResponsePanel({ session }: Props) {
  const { t } = useTranslation();
  const response = useMemo(() => parseHttpResponse(session.logs), [session.logs]);

  return (
    <PanelCard>
      <PanelHeader
        icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>}
        label={t('http.response')}
      />
      <div className="p-3 flex flex-col gap-2">
        {!response ? (
          <div className="text-2xs text-[var(--color-text-muted)] font-[family-name:var(--font-mono)]">
            {session.status === 'connected' ? 'Waiting for first request...' : 'Connect to send HTTP requests'}
          </div>
        ) : (
          <>
            <div className={`flex items-center gap-3 px-3 py-2 rounded border ${statusBgClass(response.statusCode)}`}>
              <span className={`text-lg font-bold font-[family-name:var(--font-mono)] ${statusColorClass(response.statusCode)}`}>
                {response.statusCode}
              </span>
              <span className="text-2xs text-[var(--color-text-secondary)]">
                {response.statusText}
              </span>
              <span className="ml-auto text-2xs text-[var(--color-text-muted)] font-[family-name:var(--font-mono)]">
                {response.elapsedMs} ms
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="px-2 py-1.5 rounded bg-[var(--color-surface-container)] border border-[var(--color-border-subtle)]">
                <div className="text-2xs uppercase tracking-wider text-[var(--color-text-muted)]">Content-Type</div>
                <div className="text-2xs text-[var(--color-text-primary)] font-[family-name:var(--font-mono)] truncate">
                  {response.headers['content-type'] ?? '—'}
                </div>
              </div>
              <div className="px-2 py-1.5 rounded bg-[var(--color-surface-container)] border border-[var(--color-border-subtle)]">
                <div className="text-2xs uppercase tracking-wider text-[var(--color-text-muted)]">Body Size</div>
                <div className="text-2xs text-[var(--color-text-primary)] font-[family-name:var(--font-mono)]">
                  {response.bodySize > 0 ? `${response.bodySize.toLocaleString()} B` : '—'}
                </div>
              </div>
            </div>

            {response.headers['content-type']?.includes('application/json') && (
              <div className="text-2xs text-[var(--color-success)] font-[family-name:var(--font-mono)]">
                JSON response — view in Data Log
              </div>
            )}
          </>
        )}
      </div>
    </PanelCard>
  );
}
