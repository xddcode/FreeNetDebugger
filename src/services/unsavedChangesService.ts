import type { SessionViewState } from '../store/sessionStore';
import { hasUnsavedSessions } from '../store/sessionStore';
import { flushAllFieldEditors } from '../store/fieldEditorFlushRegistry';
import { isHttpTabDraft } from '../types';

function hasPendingFieldFlush(draft: SessionViewState['tabDrafts'][string] | undefined): boolean {
  return !!(draft && isHttpTabDraft(draft) && draft.pendingFieldFlush);
}

/** Tab draft differs from catalog, or local field editors have unflushed edits. */
export function isTabUnsaved(state: SessionViewState, sessionId: string): boolean {
  const draft = state.tabDrafts[sessionId];
  return !!(draft?.dirty || hasPendingFieldFlush(draft));
}
export function syncTabFieldEditors(sessionId?: string): void {
  flushAllFieldEditors(sessionId);
}

export function hasAnyUnsavedTabs(state: SessionViewState): boolean {
  return hasUnsavedSessions(state);
}

export type GuardTarget =
  | { kind: 'app' }
  | { kind: 'closeTab'; sessionId: string }
  | { kind: 'export'; sessionId: string };

export function guardTargetNeedsConfirm(state: SessionViewState, target: GuardTarget): boolean {
  if (target.kind === 'app') {
    return hasAnyUnsavedTabs(state);
  }
  return isTabUnsaved(state, target.sessionId);
}
