/**
 * Centralised IPC handler registration. Each `ipcMain.handle` call
 * here corresponds to one entry on the renderer's
 * `window.octofocus` bridge.
 *
 * Channel naming: `<domain>:<verb>`. Keeps the channel list
 * grep-able and namespaces future additions (capture:start,
 * capture:stop, ...).
 */
import { ipcMain } from "electron";
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
}
