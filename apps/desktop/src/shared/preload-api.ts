/**
 * Shape of the bridge exposed on `window.octofocus` by the preload
 * script. Kept in `src/shared` so the renderer + preload reference
 * the exact same type — no drift between what's exposed and what the
 * renderer assumes is available.
 *
 * PR2 grows this with typed wrappers (e.g. `getToken`, `setToken`);
 * PR3 adds `startCapture` / `stopCapture` etc.
 */
/**
 * Subset of Node `process.versions` we actually surface in the
 * renderer. Re-declared as a plain string-map so the renderer
 * tsconfig (which deliberately excludes @types/node) compiles
 * without pulling Node globals.
 */
export type ProcessVersions = Readonly<Record<string, string | undefined>>;

/**
 * `process.platform` is widened to `string` for the renderer — we
 * only ever branch on `=== "darwin"` so the exact union of Node's
 * platform strings doesn't matter, and using `string` avoids
 * coupling the renderer's types to a Node version it doesn't import.
 */
export interface TokenApi {
  /** Returns the stored Bearer token, or null when none is saved. */
  get(): Promise<string | null>;
  /** Persists a new token to the OS keychain. */
  set(token: string): Promise<void>;
  /** Clears the stored token (sign-out). */
  clear(): Promise<void>;
}

export interface CaptureStartResult {
  pid: number;
  binaryPath: string;
}

export interface CaptureApi {
  /** Spawns the Swift sidecar; PCM chunks arrive via `onChunk`. */
  start(): Promise<CaptureStartResult>;
  /** Sends EOF on stdin (graceful stop) + SIGTERM after 500 ms. */
  stop(): Promise<void>;
  isRunning(): Promise<boolean>;
  /** Subscribe to PCM frames. Returns an unsubscribe function. */
  onChunk(handler: (chunk: ArrayBuffer) => void): () => void;
  /** Subscribe to human-readable diagnostics from the sidecar. */
  onLog(handler: (line: string) => void): () => void;
  /** Subscribe to sidecar exit + error events. */
  onExit(handler: (info: { code: number | null; signal: string | null }) => void): () => void;
  onError(handler: (info: { message: string }) => void): () => void;
}

export interface ShortcutsApi {
  /**
   * Subscribe to the global ⌥⌘M shortcut from the main process —
   * "toggle capture". The renderer decides what that means based on
   * the current state (start a new meeting, or stop the active one).
   */
  onToggleCapture(handler: () => void): () => void;
  /** Tell main about the latest capture state for tray painting. */
  notifyCaptureState(state: { recording: boolean }): void;
}

export interface OctofocusBridge {
  platform: string;
  versions: ProcessVersions;
  invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T>;
  token: TokenApi;
  capture: CaptureApi;
  shortcuts: ShortcutsApi;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    octofocus: OctofocusBridge;
  }
}

export {};
