/**
 * Bridge exposed on `window.octofocus` by the preload script. Lives
 * in `src/shared` so the preload and the web app reference the
 * exact same type — no drift between what's exposed and what the
 * renderer assumes is available.
 *
 * After the Part C pivot (BrowserWindow loads the hosted web app
 * directly), this bridge only carries native capabilities the web
 * app can't do on its own:
 *   - `isElectron` flag the web uses to branch its MeetingRecorder
 *     between the browser `MediaRecorder` path and the Swift
 *     sidecar PCM stream.
 *   - `capture` — sidecar lifecycle + chunk subscription.
 *   - `shortcuts` — global ⌥⌘M dispatch + capture-state notify so
 *     the menubar tray icon can repaint.
 *
 * Auth is handled entirely by the web app via the existing Supabase
 * cookie session — no token storage, no API proxy, no main-process
 * HTTP. The renderer IS the web app.
 */

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
  /** Subscribe to the global ⌥⌘M shortcut from the main process. */
  onToggleCapture(handler: () => void): () => void;
  /** Tell main about the latest capture state so the tray icon repaints. */
  notifyCaptureState(state: { recording: boolean }): void;
}

export interface OctofocusBridge {
  /** Always true when running inside the desktop app. */
  isElectron: true;
  /** Platform string ("darwin" | "win32" | "linux"). */
  platform: string;
  capture: CaptureApi;
  shortcuts: ShortcutsApi;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    octofocus?: OctofocusBridge;
  }
}

export {};
