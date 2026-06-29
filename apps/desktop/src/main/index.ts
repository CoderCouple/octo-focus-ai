/**
 * OctoFocusAI desktop — Electron main process.
 *
 * Responsibilities (today):
 *   - App lifecycle (ready / window-all-closed / activate).
 *   - Single BrowserWindow that loads either the dev server (hot
 *     reload) or the packaged renderer bundle.
 *
 * Coming in later PRs:
 *   - Spawn the Swift `mac-audio-capture` sidecar (PR5).
 *   - Bridge IPC for start/stop capture + token storage (PR2/PR3).
 *   - Menubar tray + global shortcut (PR6).
 */
import { app, BrowserWindow, shell } from "electron";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { registerIpcHandlers } from "./ipc";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 960,
    height: 640,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0a0a0a",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.once("ready-to-show", () => window.show());

  // Open external links in the default browser instead of a new
  // BrowserWindow. Keeps the app a single-window menubar surface.
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  // Renderer source:
  //   dev → Vite dev server (HMR), URL set by electron-vite via env
  //   prod → packaged index.html sitting next to the main bundle
  const devUrl = process.env["ELECTRON_RENDERER_URL"];
  if (devUrl) {
    void window.loadURL(devUrl);
  } else {
    void window.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return window;
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    // On macOS, re-create the window when the dock icon is clicked
    // and there are no other windows open. Standard Cocoa pattern.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  // macOS apps typically stay alive when all windows close —
  // explicit ⌘Q quits. We follow that convention for parity with
  // Granola / Notion's behaviour.
  if (process.platform !== "darwin") app.quit();
});
