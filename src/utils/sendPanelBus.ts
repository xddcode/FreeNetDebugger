import type { EncodingMode } from '../types';

export const sendPanelBus = {
  listeners: new Set<(text: string, enc: EncodingMode, sendNow?: boolean, append?: boolean) => void>(),
  emit(text: string, enc: EncodingMode, sendNow = false, append = false) {
    this.listeners.forEach(fn => fn(text, enc, sendNow, append));
  },
  on(fn: (text: string, enc: EncodingMode, sendNow?: boolean, append?: boolean) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  },
};
