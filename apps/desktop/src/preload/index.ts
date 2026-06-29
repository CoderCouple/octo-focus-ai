/**
 * Preload script — runs in an isolated world that has access to both
 * Node `process` (via the `electron` module) and the renderer's
 * `window`. Anything we expose via `contextBridge.exposeInMainWorld`
 * becomes available on `window.octofocus` in React.
 *
 * Today the bridge is intentionally tiny — just the platform info.
 * PR2 adds token storage; PR3 adds the capture start/stop verbs.
 */
import { contextBridge, ipcRenderer } from "electron";
import type { OctofocusBridge } from "../shared/preload-api";

const api: OctofocusBridge = {
  /** Platform string ("darwin" | "win32" | "linux"). Useful for guards. */
  platform: process.platform,
  /** Electron / chromium / node versions, for diagnostics. */
  versions: { ...process.versions },
  /**
   * Generic IPC helper — main-side handlers register via
   * `ipcMain.handle(channel, ...)`. Surfaced as `window.octofocus.invoke`.
   * Later PRs add typed wrappers (e.g. `startCapture`) that call
   * this under the hood; today the only typed wrapper is `token.*`.
   */
  invoke: <T = unknown>(channel: string, ...args: unknown[]): Promise<T> =>
    ipcRenderer.invoke(channel, ...args),
  /**
   * Bearer token vault — round-trips to the macOS Keychain via
   * keytar in the main process. The token never enters renderer
   * memory until the user explicitly fetches it for an API call.
   */
  token: {
    get: () => ipcRenderer.invoke("token:get") as Promise<string | null>,
    set: (token) => ipcRenderer.invoke("token:set", token) as Promise<void>,
    clear: () => ipcRenderer.invoke("token:clear") as Promise<void>,
  },
  /**
   * Audio capture bridge — the Swift sidecar lives in the main
   * process. Renderer subscribes to PCM chunks via `onChunk`; each
   * chunk is a 100ms slice of 16kHz mono int16 PCM ready for
   * Deepgram.
   */
  capture: {
    start: () =>
      ipcRenderer.invoke("capture:start") as Promise<{ pid: number; binaryPath: string }>,
    stop: () => ipcRenderer.invoke("capture:stop") as Promise<void>,
    isRunning: () => ipcRenderer.invoke("capture:isRunning") as Promise<boolean>,
    onChunk: (handler) => {
      const listener = (_e: Electron.IpcRendererEvent, chunk: Buffer | Uint8Array) => {
        const u8 = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
        handler(
          u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer,
        );
      };
      ipcRenderer.on("sidecar:chunk", listener);
      return () => ipcRenderer.removeListener("sidecar:chunk", listener);
    },
    onLog: (handler) => {
      const listener = (_e: Electron.IpcRendererEvent, line: string) => handler(line);
      ipcRenderer.on("sidecar:log", listener);
      return () => ipcRenderer.removeListener("sidecar:log", listener);
    },
    onExit: (handler) => {
      const listener = (
        _e: Electron.IpcRendererEvent,
        info: { code: number | null; signal: string | null },
      ) => handler(info);
      ipcRenderer.on("sidecar:exit", listener);
      return () => ipcRenderer.removeListener("sidecar:exit", listener);
    },
    onError: (handler) => {
      const listener = (_e: Electron.IpcRendererEvent, info: { message: string }) =>
        handler(info);
      ipcRenderer.on("sidecar:error", listener);
      return () => ipcRenderer.removeListener("sidecar:error", listener);
    },
  },
  /**
   * Global keyboard shortcut bridge — main registers ⌥⌘M and
   * dispatches the toggle event over IPC; the renderer turns that
   * into either "start a new meeting" or "stop the active one".
   */
  shortcuts: {
    onToggleCapture: (handler) => {
      const listener = () => handler();
      ipcRenderer.on("shortcut:toggle-capture", listener);
      return () => ipcRenderer.removeListener("shortcut:toggle-capture", listener);
    },
    notifyCaptureState: (state) => {
      ipcRenderer.send("capture:state-changed", state);
    },
  },
};

contextBridge.exposeInMainWorld("octofocus", api);
