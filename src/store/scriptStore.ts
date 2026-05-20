import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Script } from '../types';
import { STORAGE_KEY } from '../config/constants';
import { getCachedItem, setCachedItem, removeCachedItem } from './storage';

interface ScriptState {
  scripts: Script[];
  activeScriptId: string | null;

  addScript: (name?: string, source?: string) => Script;
  removeScript: (id: string) => void;
  updateScript: (id: string, patch: Partial<Omit<Script, 'id'>>) => void;
  setActiveScript: (id: string | null) => void;

  linkToSession: (scriptId: string, sessionId: string) => void;
  unlinkFromSession: (scriptId: string, sessionId: string) => void;
}

const newScriptId = () => `scr_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;

const defaultSource = `// FreeNetDebugger Script
// API: send(data), onReceive(callback), log(message), sleep(ms)

function main() {
  log('Script started');

  // Example: send data every 5 seconds
  // setInterval(() => {
  //   send('Hello from script');
  // }, 5000);

  // Example: echo received data
  // onReceive((data) => {
  //   log('Received: ' + data);
  // });
}

main();
`;

export const useScriptStore = create<ScriptState>()(
  persist(
    immer((set) => ({
      scripts: [],
      activeScriptId: null,

      addScript: (name, source) => {
        let result: Script | undefined;
        set((s) => {
          const script: Script = {
            id: newScriptId(),
            name: name?.trim() || `Script ${s.scripts.length + 1}`,
            source: source ?? defaultSource,
            enabled: true,
            autoRun: false,
            linkedSessionIds: [],
          };
          s.scripts.push(script);
          s.activeScriptId = script.id;
          result = script;
        });
        return result as Script;
      },

      removeScript: (id) =>
        set((s) => {
          const idx = s.scripts.findIndex((sc) => sc.id === id);
          if (idx === -1) { return; }
          s.scripts.splice(idx, 1);
          if (s.activeScriptId === id) {
            s.activeScriptId = s.scripts.length > 0 ? s.scripts[Math.max(0, idx - 1)].id : null;
          }
        }),

      updateScript: (id, patch) =>
        set((s) => {
          const sc = s.scripts.find((x) => x.id === id);
          if (sc) {
            Object.assign(sc, patch);
          }
        }),

      setActiveScript: (id) =>
        set((s) => { s.activeScriptId = id; }),

      linkToSession: (scriptId, sessionId) =>
        set((s) => {
          const sc = s.scripts.find((x) => x.id === scriptId);
          if (sc && !sc.linkedSessionIds.includes(sessionId)) {
            sc.linkedSessionIds.push(sessionId);
          }
        }),

      unlinkFromSession: (scriptId, sessionId) =>
        set((s) => {
          const sc = s.scripts.find((x) => x.id === scriptId);
          if (sc) {
            sc.linkedSessionIds = sc.linkedSessionIds.filter((sid) => sid !== sessionId);
          }
        }),
    })),
    {
      name: `${STORAGE_KEY}-scripts`,
      storage: createJSONStorage(() => ({
        getItem: (name) => getCachedItem(name),
        setItem: (name, value) => setCachedItem(name, value),
        removeItem: (name) => removeCachedItem(name),
      })),
      partialize: (state) => ({
        scripts: state.scripts,
        activeScriptId: state.activeScriptId,
      }),
      skipHydration: true,
    }
  )
);
