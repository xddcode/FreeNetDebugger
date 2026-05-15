# Testing Patterns

**Analysis Date:** 2026-05-15

## Test Framework

**Runner:** Not configured

**Assertion Library:** Not configured

**Config Files:** None detected

**Run Commands:**
```bash
# No test scripts defined in package.json
# Available scripts:
bun run dev        # Start Vite dev server
bun run build      # TypeScript compile + Vite build
bun run preview    # Preview production build
bun run lint       # ESLint check
bun run lint:fix   # ESLint auto-fix
bun run tauri      # Tauri CLI wrapper
```

## Test File Organization

**Location:** No test files exist in the project

**Naming:** No `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` files found in `src/` or project root

**Structure:** Not applicable — no tests present

## Test Structure

**Suite Organization:** Not applicable

**Patterns:** Not applicable

## Mocking

**Framework:** Not configured

**Patterns:** Not applicable

**What to Mock (inferred from architecture):**
- Tauri `invoke()` calls — use the `isTauri()` guard in `src/utils/tauri.ts` to detect non-Tauri environment
- Tauri event listeners (`listen()`) — wrap with mockable abstractions
- `localStorage` — Zustand persist middleware uses this
- File System Access API (`showSaveFilePicker`) — used in `ConnectionPanel.tsx`
- `FileReader` — used in `DataSend.tsx` for file loading

**What NOT to Mock:**
- Zustand store — test with actual store instance
- Utility functions (`encoding.ts`, `checksum.ts`) — these are pure and testable directly
- i18n translations — can use `initReactI18next` with test resources

## Fixtures and Factories

**Test Data:** Not applicable — no tests exist

**Recommended patterns for future tests:**

Pure utility functions are highly testable:
```typescript
// src/utils/encoding.ts — all pure functions, no side effects
export function bytesToHex(bytes: number[]): string
export function hexToBytes(hex: string): number[]
export function bytesToAscii(bytes: number[], nonPrintable?: AsciiNonPrintableMode): string
export function crc16Modbus(data: number[]): number
export function appendChecksum(data: number[], type: ChecksumType): number[]
export function formatTimestamp(ms: number): string
```

Factory for test sessions:
```typescript
// Example factory pattern based on store implementation
function createTestSession(overrides?: Partial<Session>): Session {
  return {
    id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    name: 'TCP Client',
    config: {
      protocol: 'TCP_CLIENT',
      remoteHost: '127.0.0.1',
      remotePort: 8080,
      localPort: 8080,
      localHost: '0.0.0.0',
      wsUrl: 'ws://127.0.0.1:8080',
      serialPort: '',
      baudRate: 115200,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      ...overrides?.config,
    },
    status: 'idle',
    statusMsg: '',
    receiveSettings: { encoding: 'AUTO', asciiNonPrintable: 'DOT', showAsLog: true, autoNewline: true, saveToFile: false, pauseReceiving: false },
    sendSettings: { encoding: 'ASCII', autoParseEscapes: true, autoCRLF: true, autoChecksum: false, checksumType: 'CRC16', periodicEnabled: false, periodicInterval: 1000 },
    logs: [],
    rxBytes: 0,
    txBytes: 0,
    trafficSamples: [],
    sendHistory: [],
    sendContent: '',
    ...overrides,
  };
}
```

**Location recommendation:** `src/test/factories.ts`

## Coverage

**Requirements:** None enforced

**Current state:** 0% — no tests exist

**View Coverage:** Not applicable

## Test Types

**Unit Tests:** Not present

**Recommended unit test targets (high value, low complexity):**
- `src/utils/encoding.ts` — all pure functions (bytesToHex, hexToBytes, bytesToAscii, bytesToUtf8, bytesToAuto, bytesToBase64, asciiToBytes, base64ToBytes, parseEscapeSequences, formatTimestamp)
- `src/utils/checksum.ts` — CRC16, LRC, SUM8 calculations
- `src/utils/tauri.ts` — `isTauri()` detection logic
- `src/config/app.ts` — constant values

**Integration Tests:** Not present

**Recommended integration test targets:**
- Zustand store actions (`src/store/index.ts`) — add/remove sessions, update config, append logs, traffic samples
- `sendPanelBus` event emitter (`src/utils/sendPanelBus.ts`)
- i18n locale switching

**E2E Tests:** Not used

**Recommended E2E approach:**
- Tauri does not support standard browser E2E tools (Playwright, Cypress)
- Consider Tauri's built-in WebDriver support or mock the Tauri API layer for component-level tests

## Common Patterns

**Async Testing:** Not applicable

**Recommended async test pattern for Tauri invoke:**
```typescript
// Mock the Tauri invoke wrapper
vi.mock('../../utils/tauri', () => ({
  invoke: vi.fn(),
  isTauri: vi.fn(() => true),
}));
```

**Error Testing:** Not applicable

**Recommended error test pattern:**
```typescript
// Test encoding error cases
expect(hexToBytes('GG')).toEqual([]); // invalid hex
expect(hexToBytes('ABC')).toEqual([]); // odd length
expect(base64ToBytes('!!!')).toEqual([]); // invalid base64
```

## Testing Gaps

**Critical untested areas:**

1. **Utility functions (`src/utils/encoding.ts`, `src/utils/checksum.ts`)**
   - These are pure, deterministic, and high-value test targets
   - No external dependencies, trivial to test
   - Risk: encoding bugs could corrupt user data silently

2. **Store logic (`src/store/index.ts`)**
   - Session lifecycle (add, remove, active session switching)
   - Log capping and trimming (LOGS_CAP = 100_000, LOGS_TRIM = 10_000)
   - Traffic sample rolling window (TRAFFIC_MAX = 60)
   - Send history deduplication and capping (HISTORY_MAX = 100)
   - Persist/partialize logic (migration, state filtering)
   - Risk: data loss, state corruption on session operations

3. **Tauri integration (`src/utils/tauri.ts`, `src/App.tsx`)**
   - Event listener setup and cleanup
   - Data buffering and flush logic (80ms interval)
   - Traffic sampling (1-second interval)
   - Risk: memory leaks, stale closures, missed events

4. **Component rendering**
   - All React components are untested
   - No snapshot or interaction tests
   - Risk: UI regressions on refactors

5. **File I/O (`ConnectionPanel.tsx` save/export)**
   - File System Access API usage
   - Fallback to Blob download
   - Risk: file corruption, permission errors

## Recommended Testing Setup

**Suggested test framework:**
```bash
# Add Vitest (already used by some dependencies)
bun add -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Suggested `vitest.config.ts`:**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

**Suggested test scripts in `package.json`:**
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

**Priority test files to create:**
1. `src/utils/encoding.test.ts` — highest ROI, pure functions
2. `src/utils/checksum.test.ts` — algorithm correctness
3. `src/store/index.test.ts` — store actions and state transitions
4. `src/utils/sendPanelBus.test.ts` — event emitter behavior

---

*Testing analysis: 2026-05-15*
