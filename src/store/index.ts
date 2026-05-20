// Domain-specific stores — import these directly in new code
export {
  useSessionStore,
  getActiveSession,
  getAllSessions,
  getOpenedTabView,
  getDirtyOpenedTabs,
  hasUnsavedSessions,
  getSessionGroupPath,
  isGroup,
  isSession,
} from './sessionStore';
export { useSettingsStore } from './settingsStore';
export { useLogStore } from './logStore';
export { useScriptStore } from './scriptStore';

// Re-export types for convenience
