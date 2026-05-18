import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface LogState {
  logFilter: string;
  setLogFilter: (filter: string) => void;
}

export const useLogStore = create<LogState>()(
  immer((set) => ({
    logFilter: '',
    setLogFilter: (filter) => set((s) => { s.logFilter = filter; }),
  }))
);
