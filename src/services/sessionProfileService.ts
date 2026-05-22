import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import {
  useSessionStore,
  getOpenedTabView,
  getHttpTabConfig,
} from '../store';
import { flushAllFieldEditors } from '../store/fieldEditorFlushRegistry';
import { exportToFile } from '../hooks/useFileSaver';
import { isTauri } from '../utils/tauri';
import { isHttpSession, isStreamSession } from '../types';
import {
  buildHttpExportPayload,
  parseHttpProfileImport,
} from './profiles/httpProfile';
import {
  buildStreamExportPayload,
  parseStreamProfileImport,
} from './profiles/streamProfile';

async function writeExportFile(
  content: string,
  fileName: string,
): Promise<{ ok: boolean; cancelled?: boolean }> {
  if (isTauri()) {
    try {
      const path = await save({
        defaultPath: fileName,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (!path) {
        return { ok: false, cancelled: true };
      }
      await writeTextFile(path, content);
      return { ok: true };
    } catch {
      // fall through to web-style export
    }
  }

  const result = await exportToFile(content, fileName, {
    mimeType: 'application/json',
    description: 'JSON',
    extensions: ['.json'],
  });
  return { ok: result.ok, cancelled: !result.ok && result.via === null };
}

export async function exportSessionProfile(
  sessionId: string,
): Promise<{ ok: boolean; cancelled?: boolean }> {
  flushAllFieldEditors(sessionId);
  const session = getOpenedTabView(useSessionStore.getState(), sessionId);
  if (!session) {
    return { ok: false };
  }

  let payload: unknown;
  let fileName: string;

  if (isHttpSession(session)) {
    const config = getHttpTabConfig(useSessionStore.getState(), sessionId) ?? session.config;
    payload = buildHttpExportPayload(session.name, config);
    fileName = `fnd-http-${Date.now()}.json`;
  } else if (isStreamSession(session)) {
    payload = buildStreamExportPayload(session.name, session.config, {
      receiveSettings: session.receiveSettings,
      sendSettings: session.sendSettings,
      sendContent: session.sendContent,
      sendHistory: session.sendHistory,
    });
    fileName = `fnd-${session.protocol.toLowerCase().replace('_', '-')}-${Date.now()}.json`;
  } else {
    return { ok: false };
  }

  const content = JSON.stringify(payload, null, 2);
  return writeExportFile(content, fileName);
}

export function importSessionProfileFromJson(
  sessionId: string,
  json: string,
): { ok: true } | { ok: false; reason: 'invalid' | 'parse' | 'protocolMismatch' } {
  let data: unknown;
  try {
    data = JSON.parse(json) as unknown;
  } catch {
    return { ok: false, reason: 'parse' };
  }

  const session = getOpenedTabView(useSessionStore.getState(), sessionId);
  if (!session) {
    return { ok: false, reason: 'invalid' };
  }

  const { updateConfig, updateReceiveSettings, updateSendSettings } = useSessionStore.getState();

  if (isHttpSession(session)) {
    const config = parseHttpProfileImport(data);
    if (!config) {
      return { ok: false, reason: 'invalid' };
    }
    updateConfig(sessionId, config);
    return { ok: true };
  }

  if (isStreamSession(session)) {
    const parsed = parseStreamProfileImport(data);
    if (!parsed) {
      return { ok: false, reason: 'invalid' };
    }
    if (parsed.config.protocol !== session.protocol) {
      return { ok: false, reason: 'protocolMismatch' };
    }
    updateConfig(sessionId, parsed.config);
    updateReceiveSettings(sessionId, parsed.receiveSettings);
    updateSendSettings(sessionId, parsed.sendSettings);
    return { ok: true };
  }

  return { ok: false, reason: 'invalid' };
}

export async function importSessionProfileFromFile(
  sessionId: string,
  file: File,
): Promise<{ ok: true } | { ok: false; reason: 'invalid' | 'parse' | 'read' | 'protocolMismatch' }> {
  try {
    const content = await file.text();
    const result = importSessionProfileFromJson(sessionId, content);
    if (!result.ok) {
      return result;
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'read' };
  }
}
