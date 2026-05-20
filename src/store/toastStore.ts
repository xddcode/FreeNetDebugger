import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

let _id = 0;
const nextId = () => `toast_${++_id}_${Date.now()}`;

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],

  addToast: (type, message, duration = 3000) =>
    set((state) => ({
      toasts: [...state.toasts, { id: nextId(), type, message, duration }],
    })),

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export function showToast(type: ToastType, message: string, duration?: number) {
  useToastStore.getState().addToast(type, message, duration);
}
