import { createContext, useContext, type ReactNode } from 'react';
import type { GuardTarget } from '../services/unsavedChangesService';

export type GuardedProceed = () => void | Promise<void>;

interface UnsavedGuardContextValue {
  requestGuardedAction: (target: GuardTarget, proceed: GuardedProceed) => void;
}

const UnsavedGuardContext = createContext<UnsavedGuardContextValue | null>(null);

export function UnsavedGuardProvider({
  value,
  children,
}: {
  value: UnsavedGuardContextValue;
  children: ReactNode;
}) {
  return (
    <UnsavedGuardContext.Provider value={value}>
      {children}
    </UnsavedGuardContext.Provider>
  );
}

export function useUnsavedGuard(): UnsavedGuardContextValue {
  const ctx = useContext(UnsavedGuardContext);
  if (!ctx) {
    throw new Error('useUnsavedGuard must be used within UnsavedGuardProvider');
  }
  return ctx;
}

export function useUnsavedGuardOptional(): UnsavedGuardContextValue | null {
  return useContext(UnsavedGuardContext);
}
