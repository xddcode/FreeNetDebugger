import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { QuickCommand } from '../types';
import { STORAGE_KEY } from '../config/constants';

interface SettingsState {
  locale: 'en' | 'zh-CN';
  setLocale: (locale: 'en' | 'zh-CN') => void;

  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;

  quickCommands: QuickCommand[];
  addQuickCommand: (cmd: Omit<QuickCommand, 'id'>) => void;
  removeQuickCommand: (id: string) => void;
  updateQuickCommand: (id: string, patch: Partial<Omit<QuickCommand, 'id'>>) => void;
}

const newCmdId = () => `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;

export const useSettingsStore = create<SettingsState>()(
  persist(
    immer((set) => ({
      locale: 'en',
      theme: 'dark',
      quickCommands: [],

      setLocale: (locale) => set((s) => { s.locale = locale; }),

      setTheme: (theme) => set((s) => { s.theme = theme; }),

      addQuickCommand: (cmd) =>
        set((s) => { s.quickCommands.push({ ...cmd, id: newCmdId() }); }),

      removeQuickCommand: (id) =>
        set((s) => { s.quickCommands = s.quickCommands.filter((c: QuickCommand) => c.id !== id); }),

      updateQuickCommand: (id, patch) =>
        set((s) => {
          const c = s.quickCommands.find((c: QuickCommand) => c.id === id);
          if (c) {
            Object.assign(c, patch);
          }
        }),
    })),
    {
      name: `${STORAGE_KEY}-settings`,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        locale: state.locale,
        theme: state.theme,
        quickCommands: state.quickCommands,
      }),
    }
  )
);
