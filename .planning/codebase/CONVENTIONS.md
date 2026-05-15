# Coding Conventions

**Analysis Date:** 2026-05-15

## Naming Patterns

**Files:**
- Component files: PascalCase matching the component name. Examples: `DataLog.tsx`, `ConnectionPanel.tsx`, `SendCenterDrawer.tsx`, `TrafficChart.tsx`
- Utility files: camelCase. Examples: `encoding.ts`, `checksum.ts`, `tauri.ts`, `sendPanelBus.ts`
- Configuration files: camelCase or UPPER_SNAKE for constants. Examples: `app.ts`, `en.ts`
- Barrel/index files: `index.ts` (types, store, i18n)

**Functions:**
- Utility functions: camelCase. Examples: `bytesToHex()`, `hexToBytes()`, `formatTimestamp()`, `appendChecksum()`
- React components: PascalCase. Examples: `DataLog`, `AppLayout`, `ConnectionPanel`
- Internal/helper components: PascalCase. Examples: `LogRow`, `Sparkline`, `SessionDot`, `PanelCard`
- Event handlers: prefixed with `handle`. Examples: `handleConnect`, `handleToggleLang`, `handleCloseSession`, `handleKeyDown`, `handleSaveToFile`, `handleFileOpen`
- Zustand selectors: camelCase matching store method names. Examples: `setStatus`, `appendLog`, `addRxBytes`

**Variables:**
- Local variables: camelCase. Examples: `pendingLogs`, `filteredLogs`, `asciiMode`
- Constants (module-level): UPPER_SNAKE_CASE. Examples: `TRAFFIC_MAX`, `HISTORY_MAX`, `LOGS_CAP`, `LOGS_TRIM`, `FLUSH_INTERVAL_MS`
- React refs: suffixed with `Ref`. Examples: `parentRef`, `fileHandleRef`, `writeChainRef`, `periodicRef`, `prevBytesRef`
- Boolean flags: prefixed with `is` or `has`. Examples: `isActive`, `isBusy`, `isAlive`, `isConn`, `isListen`, `isError`

**Types:**
- Type aliases: PascalCase. Examples: `ProtocolType`, `ConnectionStatus`, `EncodingMode`
- Interfaces: PascalCase. Examples: `Session`, `LogEntry`, `ConnectionConfig`, `TrafficSample`
- Props interfaces: named `Props` (simple, consistent). Examples: `interface Props { session: Session }`
- Generic utility types: PascalCase. Example: `Translations`, `PersistedState`

## Code Style

**Formatting:**
- No Prettier configuration detected. Style relies on manual consistency.
- Indentation: 2 spaces
- Semicolons: required (enforced by ESLint)
- Single quotes for strings
- Trailing commas in multi-line objects/arrays (observed pattern)

**Linting:**
- Tool: ESLint 10.x with flat config (`eslint.config.mjs`)
- Key rules enforced:
  - `@typescript-eslint/no-explicit-any`: warn
  - `@typescript-eslint/no-unused-vars`: error (ignores `_` prefix)
  - `@typescript-eslint/consistent-type-imports`: error (prefer `type` imports)
  - `@typescript-eslint/no-non-null-assertion`: warn
  - `react-refresh/only-export-components`: warn (with `allowConstantExport: true`)
  - `no-console`: warn (allows `console.warn` and `console.error` only)
  - `prefer-const`: error
  - `no-var`: error
  - `eqeqeq`: error (always use `===`/`!==`)
  - `curly`: error (always use braces)
- Run: `bun run lint` or `eslint src --max-warnings 0`
- Auto-fix: `bun run lint:fix`

**TypeScript:**
- Strict mode enabled (`strict: true` in `tsconfig.json`)
- `noUnusedLocals`: true
- `noUnusedParameters`: true
- `noFallthroughCasesInSwitch`: true
- `jsx`: `react-jsx` (no need to import React for JSX)
- Module resolution: `bundler`

## Import Organization

**Order (observed pattern):**
1. React imports: `import { useEffect, useRef } from 'react'`
2. Third-party library imports: `import { useTranslation } from 'react-i18next'`
3. Tauri API imports: `import { listen } from '@tauri-apps/api/event'`
4. Absolute project imports (store, types, utils, config): `import { useAppStore } from '../../store'`
5. Relative sibling/component imports: `import ConnectionPanel from '../sidebar/ConnectionPanel'`
6. Type imports (using `import type`): `import type { Session } from '../../types'`

**Path Aliases:**
- No path aliases configured in `tsconfig.json` or `vite.config.ts`
- All imports use relative paths (`../../store`, `../types`, `./App`)

**Type Imports:**
- Always use `import type { ... }` for type-only imports (enforced by ESLint rule `@typescript-eslint/consistent-type-imports`)
- Example: `import type { EncodingMode, Session } from '../../types'`

## Error Handling

**Patterns:**
- Use `try/catch` for async operations that may fail
- Swallow errors silently with empty catch blocks when the failure is non-critical: `catch { /* ignore */ }`
- Log errors to the application log (not console) using `appendLog` with system direction
- Example from `ConnectionPanel.tsx`:
  ```typescript
  try {
    await invoke('connect', { id: session.id, config: cfg });
  } catch (e) {
    setStatus(session.id, 'error', String(e));
    appendLog(session.id, { timestamp: Date.now(), direction: 'system', data: Array.from(new TextEncoder().encode(`ERROR: ${e}`)) });
  }
  ```
- Tauri runtime guard: `utils/tauri.ts` wraps `invoke()` to throw a user-friendly error when not running in Tauri

## Logging

**Framework:** Application log via Zustand store (not console)

**Patterns:**
- No `console.log` usage in production code (ESLint `no-console` rule warns)
- All user-visible messages go through `appendLog()` with `direction: 'system'`
- System log entries use `TextEncoder` to convert strings to byte arrays: `Array.from(new TextEncoder().encode(message))`
- i18n keys are used for all user-facing text; no hardcoded UI strings

## Comments

**When to Comment:**
- Explain non-obvious optimization decisions
- Document performance-critical code paths
- Mark future/pro features with `[PRO]` tag
- Explain why a particular pattern is used (not what it does)

**Examples from codebase:**
```typescript
// O(1) append — no Zustand/React involvement
// Drain buffers atomically
// Single Zustand update per session (not per packet)
// [PRO] Future: parsed result from user script
```

**JSDoc/TSDoc:**
- Minimal usage. Only `utils/tauri.ts` has JSDoc for the `invoke()` wrapper function
- No TSDoc on component props (types are self-documenting via interfaces)

## Function Design

**Size:**
- Keep functions focused and small. Helper components extracted inline:
  - `PanelCard`, `PanelHeader`, `FieldLabel`, `FieldInput`, `FieldSelect`, `CheckRow`, `RadioGroup` in `ConnectionPanel.tsx`
  - `Sparkline` in `TrafficChart.tsx`
  - `SessionDot` in `AppLayout.tsx`

**Parameters:**
- Prefer destructured props in React components
- Use optional parameters with defaults where appropriate
- Example: `function bytesToAscii(bytes: number[], nonPrintable: AsciiNonPrintableMode = 'DOT'): string`

**Return Values:**
- Explicit return types on utility functions
- React components infer JSX return type
- Early returns for guard clauses instead of nested if-blocks

## Module Design

**Exports:**
- Components: `export default function ComponentName(props: Props)`
- Utilities: Named exports. Example: `export function bytesToHex(...)`
- Types: Named exports from `types/index.ts`
- Store: Named export `useAppStore` and helper `getActiveSession`

**Barrel Files:**
- `src/types/index.ts` — central type definitions barrel
- `src/store/index.ts` — Zustand store definition and exports
- `src/i18n/index.ts` — i18n initialization (side-effect import)

**No barrel files for components** — import components directly from their files

## React Patterns

**Component Structure:**
- Default-exported functional components
- Props typed with `interface Props { ... }`
- Hooks extracted from Zustand store with selector functions (one per line for readability)

**State Management:**
- Zustand with Immer middleware for immutable updates
- Zustand with persist middleware for localStorage persistence
- Store accessed via `useAppStore(selector)` pattern
- Store state read directly via `useAppStore.getState()` outside React renders

**Performance:**
- `useCallback` for event handlers passed to child components or stored in refs
- `useMemo` for computed values (filtered lists, derived data)
- `memo()` for expensive child components (e.g., `LogRow` in `DataLog.tsx`)
- Custom comparison function for `memo()` when needed
- `useRef` for mutable values that don't trigger re-renders (buffers, flags)

**Refs Usage:**
- `pendingLogs`, `pendingRx`, `pendingTx` in `App.tsx` — high-throughput data buffers
- `parentRef` in `DataLog.tsx` — scroll container for virtualizer
- `fileHandleRef`, `writeChainRef` in `ConnectionPanel.tsx` — file system access
- `periodicRef` in `DataSend.tsx` — interval timer cleanup
- `prevBytesRef` in `App.tsx` — previous byte counts for rate calculation

## Styling Conventions

**CSS:**
- Tailwind CSS v4 with `@theme` directive in `src/index.css`
- Custom CSS properties (variables) for theme colors: `--color-primary`, `--color-accent`, `--color-success`
- Custom utility classes: `.neon-card`, `.btn-interactive`, `.field-control`, `.focus-ring`
- Inline styles used for dynamic values (colors, dimensions, conditional styles)
- `style` prop combined with Tailwind `className` for layout

**Naming CSS Classes:**
- `.btn-interactive` — interactive button base
- `.neon-card` — card container with neon border
- `.field-control` — form input base styling
- `.focus-ring` — focus-visible outline
- `.hex-grid` — background pattern
- `.brushed-metal` — textured background
- `.crt-scanlines` — CRT overlay effect

## i18n Patterns

**Translation Keys:**
- Namespaced by feature area: `status.*`, `protocol.*`, `network.*`, `receive.*`, `send.*`, `log.*`, `sendCenter.*`
- Use `useTranslation()` hook in all components
- Keys referenced via dot notation: `t('network.connect')`, `t('log.title')`
- Type-safe translations derived from English locale: `type Translations = DeepString<typeof en>`

**Locale Files:**
- `src/i18n/locales/en.ts` — source of truth for translation keys
- `src/i18n/locales/zh-CN.ts` — Chinese translations, typed with `Translations`
- `src/i18n/index.ts` — i18next initialization with `initReactI18next`

---

*Convention analysis: 2026-05-15*
