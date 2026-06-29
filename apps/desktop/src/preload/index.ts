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
};

contextBridge.exposeInMainWorld("octofocus", api);
