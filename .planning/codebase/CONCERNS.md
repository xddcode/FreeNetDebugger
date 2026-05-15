# Codebase Concerns

**Analysis Date:** 2026-05-15

## Tech Debt

### Zustand Store Monolith

- Issue: The entire application state is centralized in a single 302-line store (`src/store/index.ts`) with 40+ actions. All components subscribe to slices of this store, but the store handles sessions, logs, traffic, quick commands, locale, and send history all in one file.
- Files: `src/store/index.ts`
- Impact: As features grow (scripts, protocol parsers, multiple locales), this file becomes a bottleneck. Adding new state requires modifying the central store, increasing merge conflicts and cognitive load.
- Fix approach: Split into domain-specific stores (sessionStore, logStore, settingsStore) or use Zustand's `subscribeWithSelector` pattern more explicitly. Consider splitting the store file into `store/slices/` modules.

### Hardcoded Constants Scattered

- Issue: Magic numbers are defined inline in multiple files with no central configuration.
  - `TRAFFIC_MAX = 60` and `HISTORY_MAX = 100` in `src/store/index.ts`
  - `LOGS_CAP = 100_000` and `LOGS_TRIM = 10_000` in `src/store/index.ts`
  - `FLUSH_INTERVAL_MS = 80` in `src/App.tsx`
  - `PAD = 60` in `src/components/traffic/TrafficChart.tsx`
  - `READ_BUF = 65_536` and `CHAN_CAP = 2048` in `src-tauri/src/utils.rs`
- Files: `src/store/index.ts`, `src/App.tsx`, `src/components/traffic/TrafficChart.tsx`, `src-tauri/src/utils.rs`
- Impact: Changing behavior requires hunting across files. Risk of inconsistency (e.g., `TRAFFIC_MAX` in store is 60 but `PAD` in TrafficChart is also 60 — they must stay in sync).
- Fix approach: Create a shared constants module (e.g., `src/config/constants.ts`) that both frontend and backend reference. For Rust, consider a build-time generated constants file or shared config JSON.

### Inline Styles Everywhere

- Issue: Components use extensive inline `style={{ ... }}` objects instead of CSS classes. `SendCenterDrawer.tsx` has 50+ inline style declarations. `AppLayout.tsx` and `ConnectionPanel.tsx` are similarly affected.
- Files: `src/components/send/SendCenterDrawer.tsx`, `src/components/layout/AppLayout.tsx`, `src/components/sidebar/ConnectionPanel.tsx`
- Impact: Hard to theme, hard to override, no CSS purging benefits, larger bundle size from repeated style objects, harder to maintain consistent design tokens.
- Fix approach: Extract repeated style patterns into CSS utility classes in `src/index.css` or use Tailwind arbitrary values sparingly. Move color values to CSS custom properties (some already exist in `--color-*`).

### ConnectionPanel Component is Too Large

- Issue: `ConnectionPanel.tsx` is 380 lines and mixes UI rendering, connection logic, file I/O (save-to-file), log export, and protocol-specific field visibility. It violates single-responsibility.
- Files: `src/components/sidebar/ConnectionPanel.tsx`
- Impact: Difficult to test, difficult to reason about, high risk of bugs when modifying any of the mixed concerns.
- Fix approach: Extract `FileSaver` logic into a custom hook (`useFileSaver`), extract `LogExporter` into a utility/hook, and split the protocol form fields into sub-components.

### Serial Port Protocol is Stubbed

- Issue: `SERIAL` is listed as a protocol type in the UI (`src/types/index.ts`, `src/components/sidebar/ConnectionPanel.tsx`) but the Rust backend has no implementation. The `list_serial_ports` command exists but is unused. The `ConnectionConfig` type includes serial fields (`serialPort`, `baudRate`, `dataBits`, `stopBits`, `parity`) that are never passed to the backend.
- Files: `src/types/index.ts`, `src/components/sidebar/ConnectionPanel.tsx`, `src-tauri/src/commands.rs`, `src-tauri/src/protocols.rs`
- Impact: Dead code in the frontend types and UI. Users can select "Serial Port" but nothing happens on connect. Confusing UX.
- Fix approach: Either implement serial support in Rust using the `serialport` crate (already in `Cargo.toml`), or remove the SERIAL option from the UI until it is ready.

### Scripts Tab is Placeholder

- Issue: The "Scripts" tab in `SendCenterDrawer` renders a hardcoded "Coming soon" message. The `src/components/scripts/` directory is empty.
- Files: `src/components/send/SendCenterDrawer.tsx` (lines 419-426), `src/components/scripts/`
- Impact: Incomplete feature visible to users. Wasted UI space.
- Fix approach: Hide the scripts tab until the feature is implemented, or implement the script execution engine.

## Known Bugs

### Log ID Counter Not Persisted

- Issue: `_logId` is a module-level `let` variable in `src/store/index.ts` (line 14). It resets to 0 on every app reload. The `persist` middleware strips log data, but if logs are ever persisted or if the counter overlaps with restored state, IDs may collide.
- Files: `src/store/index.ts`
- Trigger: Reload the app, create logs. The IDs restart from 1.
- Workaround: None. Currently mitigated by the fact that logs are not persisted.
- Fix approach: Use a timestamp-based ID or persist the counter in localStorage.

### File Save Chain Error Swallowing

- Issue: In `ConnectionPanel.tsx`, the `appendLineToFile` function catches errors with `.catch(() => {})` (line 140), silently discarding file write failures. If the file becomes unavailable (e.g., deleted, permissions changed), the user has no feedback.
- Files: `src/components/sidebar/ConnectionPanel.tsx`
- Trigger: Enable "Save to File", then delete/restrict the target file while data is flowing.
- Workaround: Manually toggle save-to-file off and on again.
- Fix approach: Surface write errors to the user via a log entry or toast notification. Reset `fileHandleRef` on error.

### Empty Catch in Disconnect

- Issue: `AppLayout.tsx` line 117-118 has `try { await invoke('disconnect', { id }); } catch { /* Ignore */ }`. If disconnect fails, the session is still removed from the UI but the Rust-side connection may remain active.
- Files: `src/components/layout/AppLayout.tsx`
- Trigger: Close a tab while the connection is in a bad state.
- Workaround: None.
- Fix approach: Log the error, attempt force-cleanup, or show a warning before removing the session.

## Security Considerations

### Content Security Policy is Disabled

- Risk: `tauri.conf.json` sets `"csp": null`, disabling the Content Security Policy entirely.
- Files: `src-tauri/tauri.conf.json`
- Current mitigation: None. The app is a desktop app, not a browser, but XSS via user data (logs, received network data) could still be exploited.
- Recommendations: Define a strict CSP. Since the app loads no external scripts, a policy like `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:;` would be appropriate. The inline styles in `index.html` require `'unsafe-inline'` for `style-src`.

### External Font Loading

- Risk: `index.html` loads Google Fonts (`fonts.googleapis.com`) over the network.
- Files: `index.html`
- Current mitigation: None. If the network is compromised or Google Fonts is unreachable, the app may have layout shifts or fail to load fonts.
- Recommendations: Self-host the fonts or bundle them as static assets. This also improves offline functionality.

### Unvalidated Network Input Rendered as Text

- Risk: Received network data is rendered directly in the log view (`DataLog.tsx`). While the data is displayed as text nodes (not HTML), the `bytesToDisplay` function does not sanitize control characters or escape sequences that could affect terminal emulators or cause issues in copy-paste scenarios.
- Files: `src/components/log/DataLog.tsx`, `src/utils/encoding.ts`
- Current mitigation: Non-printable chars are replaced with `.` or `\xNN` in ASCII mode. UTF-8 mode uses `TextDecoder` directly.
- Recommendations: Ensure all rendering paths properly escape or replace control characters. Consider a "safe mode" for received data display.

### No Input Validation on Connection Config

- Risk: Hostnames, ports, and WebSocket URLs are passed directly from the frontend to the Rust backend without validation. Malformed input could cause panics or unexpected behavior.
- Files: `src/components/sidebar/ConnectionPanel.tsx`, `src-tauri/src/commands.rs`
- Current mitigation: Rust's `format!` and `TcpStream::connect` will return errors for bad addresses.
- Recommendations: Add frontend validation for IP addresses, port ranges (1-65535), and URL format before invoking `connect`.

## Performance Bottlenecks

### Log Filtering Re-renders on Every Keystroke

- Problem: `DataLog.tsx` filters logs with `useMemo` that depends on `session.logs`, `logFilter`, `session.receiveSettings.encoding`, and `asciiMode`. Every keystroke in the search box re-runs the filter over all logs (up to 100,000 entries).
- Files: `src/components/log/DataLog.tsx`
- Cause: `useMemo` with `session.logs` as a dependency. The filter calls `renderData()` (which may call `bytesToDisplay`) for every log entry.
- Improvement path: Debounce the filter input. Use a web worker for filtering large log sets. Or maintain a pre-computed text index of log entries.

### Virtualizer Estimate Size is Static

- Problem: `useVirtualizer` in `DataLog.tsx` uses a fixed `estimateSize: () => 50`. Log rows with HEX_TEXT mode or long wrapped content can be much taller, causing scroll position jumps.
- Files: `src/components/log/DataLog.tsx`
- Cause: The `measureElement` callback is provided but the initial estimate is inaccurate for variable-height content.
- Improvement path: Provide a better estimate based on the encoding mode and average data length. Or use `measureElement` more aggressively on first mount.

### Traffic Chart Re-renders Every Second

- Problem: `TrafficChart` receives `samples` array and re-renders every second when a new sample is added. It recomputes `useMemo` for sparkline paths, padded arrays, and formatted stats on every render.
- Files: `src/components/traffic/TrafficChart.tsx`
- Cause: The `samples` array reference changes every second, triggering all `useMemo` hooks.
- Improvement path: Memoize the component with `React.memo` and use deep comparison or stable references for `samples`. The sparkline path computation is cheap but the padded array creation (`Array(Math.max(0, PAD - rxData.length)).fill(0).concat(rxData)`) allocates on every render.

### Rust Event Emission is Fire-and-Forget

- Problem: `emit_data` and `emit_status` in Rust use `let _ = app.emit(...)` which silently drops errors. Under high throughput, the Tauri event channel could backpressure and drop events.
- Files: `src-tauri/src/events.rs`
- Cause: No backpressure handling or acknowledgment mechanism.
- Improvement path: Monitor for event emission failures. Consider batching events on the Rust side before emitting, similar to the frontend's 80ms flush buffer.

## Fragile Areas

### Zustand Persist Migration

- Files: `src/store/index.ts` (lines 266-276)
- Why fragile: The `migrate` function only handles one field (`sendContent`). As the schema evolves, migrations will compound. The `partialize` function strips ephemeral data but the type cast `as { sendContent: string }` is brittle.
- Safe modification: Add a version number to the persisted state. Write explicit migration functions per version. Use a schema validation library (e.g., Zod) to validate persisted state on load.
- Test coverage: No tests exist for store migration logic.

### Frontend-Backend Type Sync

- Files: `src/types/index.ts`, `src-tauri/src/types.rs`
- Why fragile: TypeScript and Rust types are manually kept in sync. `ConnectionConfig` in TS has camelCase fields (`remoteHost`, `localPort`) while Rust has snake_case (`remote_host`, `local_port`). The mapping happens in `ConnectionPanel.tsx` line 91-98. If either side changes, serialization breaks silently.
- Safe modification: Generate TypeScript types from Rust using `ts-rs` or maintain a shared JSON schema. At minimum, add a runtime validation layer on the frontend for Tauri event payloads.
- Test coverage: No integration tests verify the TS/Rust type contract.

### Session ID Generation

- Files: `src/store/index.ts` (line 18)
- Why fragile: `newSessionId()` uses `Date.now() + Math.random()`. In theory, rapid successive calls could collide (though unlikely). More importantly, the ID format is not validated anywhere.
- Safe modification: Use a proper UUID library or crypto.randomUUID().

### File System Access API Fallback

- Files: `src/components/sidebar/ConnectionPanel.tsx` (lines 181-238)
- Why fragile: The export logic has two paths (File System Access API vs. Blob download) with duplicated error handling. The fallback path creates a temporary anchor element and relies on browser download behavior, which varies across platforms.
- Safe modification: Use Tauri's `fs` plugin for consistent file operations across platforms, or unify the two paths into a single abstraction.

## Scaling Limits

### Log Memory Cap

- Current capacity: 100,000 log entries per session (`LOGS_CAP`).
- Limit: Each entry holds a `number[]` of raw bytes. At high throughput (e.g., 1 KB packets), this could consume significant memory. 100K * 1KB = ~100 MB per session before trimming.
- Scaling path: Store logs in a ring buffer structure instead of an array with `splice()`. Consider offloading old logs to IndexedDB or a flat file.

### Traffic Sample Array

- Current capacity: 60 samples (`TRAFFIC_MAX`), representing 60 seconds of history.
- Limit: The chart only shows the last minute. No historical data is persisted.
- Scaling path: Increase `TRAFFIC_MAX` or downsample older data. Persist traffic history to disk for long-term analysis.

### Send History

- Current capacity: 100 items (`HISTORY_MAX`).
- Limit: Stored in memory and persisted to localStorage. Large history strings (e.g., file contents) could exceed localStorage quota (~5-10 MB).
- Scaling path: Truncate individual history item length. Store history in IndexedDB instead of localStorage.

## Dependencies at Risk

### React 19

- Risk: The project uses React 19.1.0, which is relatively new. Some third-party libraries may not be fully compatible.
- Impact: `@tanstack/react-virtual` and `zustand` both claim React 19 support, but edge cases may exist. The `eslint-plugin-react-hooks` version should be monitored for React 19 compatibility.
- Migration plan: Stay on React 19 but monitor for patch releases. Test thoroughly before upgrading minor versions.

### Tailwind CSS v4

- Risk: Using Tailwind CSS v4.2.1 with the new `@import "tailwindcss"` syntax. This is a major version change from v3.
- Impact: Plugin ecosystem (e.g., tailwind forms, typography) may lag behind. The `@theme` directive syntax is v4-specific.
- Migration plan: Avoid v3 plugins. If needed, use CSS custom properties directly instead of Tailwind plugins.

### Tauri v2

- Risk: Tauri v2 is still relatively new. The `tauri-plugin-opener` is used for opening external URLs.
- Impact: Tauri v2 has breaking changes from v1. Some community plugins may not be ported yet.
- Migration plan: Stay on v2. Monitor Tauri releases for security patches.

## Missing Critical Features

### No Tests

- Problem: Zero test files exist in the repository. No unit tests, no integration tests, no E2E tests.
- Files: Entire codebase
- Blocks: Confident refactoring, regression prevention, CI/CD quality gates.
- Priority: High

### No Error Boundaries

- Problem: No React error boundaries are implemented. A crash in any component (e.g., `TrafficChart` with malformed data) will unmount the entire app.
- Files: `src/App.tsx`
- Blocks: Graceful degradation.
- Priority: High

### No Serial Port Support (Despite UI Claims)

- Problem: As noted above, SERIAL is in the UI but not implemented.
- Files: `src-tauri/src/protocols.rs`
- Blocks: Users expecting serial port functionality.
- Priority: Medium

### No Persistent Log Storage

- Problem: Logs are ephemeral. On app restart, all logs are lost.
- Files: `src/store/index.ts` (partialize strips logs)
- Blocks: Post-session analysis, debugging historical issues.
- Priority: Medium

## Test Coverage Gaps

### Store Logic

- What's not tested: All Zustand actions (addSession, removeSession, appendLog, appendLogs, log trimming, traffic sample management).
- Files: `src/store/index.ts`
- Risk: Logic bugs in log trimming, session switching, or state migration go unnoticed.
- Priority: High

### Encoding Utilities

- What's not tested: `hexToBytes`, `bytesToHex`, `bytesToUtf8`, `bytesToAuto`, `parseEscapeSequences`, checksum functions.
- Files: `src/utils/encoding.ts`, `src/utils/checksum.ts`
- Risk: Incorrect hex parsing, edge cases with non-printable characters, malformed input handling.
- Priority: High

### Rust Protocol Handlers

- What's not tested: TCP client/server, UDP client/server, WebSocket connection logic. Error paths (connection refused, timeout, write failure) are untested.
- Files: `src-tauri/src/protocols.rs`, `src-tauri/src/commands.rs`
- Risk: Memory leaks (e.g., TCP server client_txs vector growing unbounded), race conditions on disconnect, abort handle misuse.
- Priority: High

### Connection Lifecycle

- What's not tested: The full connect -> send -> receive -> disconnect flow. Status mapping between Rust and TS.
- Files: `src/App.tsx`, `src/components/sidebar/ConnectionPanel.tsx`
- Risk: Status desync, event listener leaks, pending buffer data loss on disconnect.
- Priority: Medium

---

*Concerns audit: 2026-05-15*
