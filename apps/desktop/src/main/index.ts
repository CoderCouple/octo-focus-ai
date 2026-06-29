/**
 * OctoFocusAI desktop — Electron main process.
 *
 * Responsibilities:
 *   - App lifecycle (ready / window-all-closed / activate).
 *   - Single BrowserWindow that loads either the dev server or the
 *     packaged renderer bundle.
 *   - Tray icon (menubar) + global ⌥⌘M shortcut for toggle-capture.
 *   - Forwards IPC + sidecar lifecycle to the renderer (see
 *     ./ipc.ts and ./sidecar.ts).
 */
import { app, BrowserWindow, globalShortcut, ipcMain, shell } from "electron";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { registerIpcHandlers } from "./ipc";
import { installTray, setTrayRecordingState } from "./tray";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

let mainWindow: BrowserWindow | null = null;

function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

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

  mainWindow = window;
  window.on("closed", () => {
    if (mainWindow === window) mainWindow = null;
  });

  return window;
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
  installTray(getMainWindow);

  // Renderer notifies main whenever the capture state flips so the
  // menubar icon can re-paint. Bound on the global ipcMain so it
  // works regardless of which window is active (BrowserView, etc.).
  ipcMain.on("capture:state-changed", (_event, state: { recording: boolean }) => {
    setTrayRecordingState(Boolean(state?.recording), getMainWindow());
  });

  // ⌥⌘M — global shortcut to toggle the capture surface. The
  // renderer interprets the event based on current state (start a
  // new meeting + capture, or stop the active one).
  const registered = globalShortcut.register("Alt+Cmd+M", () => {
    const window = getMainWindow();
    if (!window) return;
    if (!window.isVisible()) {
      window.show();
      window.focus();
    }
    window.webContents.send("shortcut:toggle-capture");
  });
  if (!registered) {
    console.warn("Failed to register ⌥⌘M global shortcut (likely already taken).");
  }

  app.on("activate", () => {
    // On macOS, re-create the window when the dock icon is clicked
    // and there are no other windows open. Standard Cocoa pattern.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  // macOS apps typically stay alive when all windows close —
  // explicit ⌘Q quits. We follow that convention for parity with
  // Granola / Notion's behaviour.
  if (process.platform !== "darwin") app.quit();
});
