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
   * Later PRs add typed wrappers (e.g. `getToken`, `startCapture`)
   * that call this under the hood.
   */
  invoke: <T = unknown>(channel: string, ...args: unknown[]): Promise<T> =>
    ipcRenderer.invoke(channel, ...args),
};

contextBridge.exposeInMainWorld("octofocus", api);
