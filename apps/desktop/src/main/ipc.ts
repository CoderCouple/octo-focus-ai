/**
 * Centralised IPC handler registration. After the Part C pivot the
 * desktop is a thin shell — auth + API live on the hosted web app.
 * The only IPCs left are the Swift sidecar lifecycle handlers.
 */
import { BrowserWindow, ipcMain } from "electron";
import { isSidecarRunning, startSidecar, stopSidecar } from "./sidecar";

export function registerIpcHandlers(): void {
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
