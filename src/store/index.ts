// Domain-specific stores — import these directly in new code
export {
  useSessionStore,
  getActiveSession,
  getAllSessions,
  getOpenedTabView,
  getOpenedTabSessions,
  getHttpTabConfig,
  getStreamTabConfig,
  getSessionTabConfig,
  getDirtyOpenedTabs,
  hasUnsavedSessions,
  getSessionGroupPath,
  isGroup,
  isSession,
} from './sessionStore';
export { isStreamSession, isHttpSession } from '../types';
export { useSettingsStore } from './settingsStore';
export { useLogStore } from './logStore';
export { useScriptStore } from './scriptStore';

// Re-export types for convenience
