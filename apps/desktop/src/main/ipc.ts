/**
 * Centralised IPC handler registration. Each `ipcMain.handle` call
 * here corresponds to one entry on the renderer's
 * `window.octofocus` bridge.
 *
 * Channel naming: `<domain>:<verb>`. Keeps the channel list
 * grep-able and namespaces future additions (capture:start,
 * capture:stop, ...).
 */
import { BrowserWindow, ipcMain } from "electron";
import { isSidecarRunning, startSidecar, stopSidecar } from "./sidecar";
import { clearStoredToken, getStoredToken, setStoredToken } from "./token-store";

export function registerIpcHandlers(): void {
  ipcMain.handle("token:get", async () => getStoredToken());
  ipcMain.handle("token:set", async (_event, token: string) => {
    if (typeof token !== "string" || token.length < 8) {
      throw new Error("Invalid token shape.");
    }
    await setStoredToken(token);
  });
  ipcMain.handle("token:clear", async () => clearStoredToken());

  // Audio capture: start / stop the Swift sidecar. The sidecar
  // emits PCM chunks on stdout which the main process forwards to
  // the renderer via `sidecar:chunk` events.
  ipcMain.handle("capture:start", (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) throw new Error("No window for capture start.");
    return startSidecar(window);
  });
  ipcMain.handle("capture:stop", async () => {
    stopSidecar();
  });
  ipcMain.handle("capture:isRunning", async () => isSidecarRunning());
}
