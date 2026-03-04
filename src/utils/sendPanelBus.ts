import type { EncodingMode } from '../types';

export const sendPanelBus = {
  listeners: new Set<(text: string, enc: EncodingMode) => void>(),
  emit(text: string, enc: EncodingMode) {
    this.listeners.forEach(fn => fn(text, enc));
  },
  on(fn: (text: string, enc: EncodingMode) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  },
};
