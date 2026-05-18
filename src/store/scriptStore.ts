import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { STORAGE_KEY } from '../config/constants';

interface Script {
  id: string;
  name: string;
  code: string;
  sessionId?: string;
  autoRun: boolean;
}

interface ScriptState {
  scripts: Script[];
  activeScriptId: string | null;
  addScript: (script: Omit<Script, 'id'>) => void;
  removeScript: (id: string) => void;
  updateScript: (id: string, patch: Partial<Omit<Script, 'id'>>) => void;
  setActiveScript: (id: string | null) => void;
}

const newScriptId = () => `script_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;

export const useScriptStore = create<ScriptState>()(
  persist(
    immer((set) => ({
      scripts: [],
      activeScriptId: null,

      addScript: (script) =>
        set((s) => { s.scripts.push({ ...script, id: newScriptId() }); }),

      removeScript: (id) =>
        set((s) => { s.scripts = s.scripts.filter((sc) => sc.id !== id); }),

      updateScript: (id, patch) =>
        set((s) => {
          const sc = s.scripts.find((x) => x.id === id);
          if (sc) {
            Object.assign(sc, patch);
          }
        }),

      setActiveScript: (id) => set((s) => { s.activeScriptId = id; }),
    })),
    {
      name: `${STORAGE_KEY}-scripts`,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        scripts: state.scripts,
        activeScriptId: state.activeScriptId,
      }),
    }
  )
);
