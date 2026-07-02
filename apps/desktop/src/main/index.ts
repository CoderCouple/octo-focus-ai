/**
 * OctoFocusAI desktop — Electron main process.
 *
 * The desktop is a thin Chromium shell around the hosted OctoFocusAI
 * web app (Notion / Linear / Slack playbook). Native value-add lives
 * in this shell:
 *   - Swift `mac-audio-capture` sidecar (ScreenCaptureKit system
 *     audio + mic, mixed to PCM) — spawned per session, chunks
 *     forwarded to the renderer via IPC.
 *   - Tray icon (menubar) with recording-state paint.
 *   - ⌥⌘M global shortcut to toggle capture.
 *
 * Auth, UI, every API call: handled by the web app inside the
 * BrowserWindow. The renderer IS the web app.
 */
import { app, BrowserWindow, globalShortcut, ipcMain, shell } from "electron";
import { join } from "node:path";
import { registerIpcHandlers } from "./ipc";
import { installTray, setTrayRecordingState } from "./tray";

const DEFAULT_WEB_URL = "https://www.octofocus.ai";

let mainWindow: BrowserWindow | null = null;

function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

function resolveWebUrl(): string {
  // OCTOFOCUS_WEB_URL lets the user point at a local Next dev server
  // (e.g. http://localhost:3000) without rebuilding. Defaults to prod.
  return process.env["OCTOFOCUS_WEB_URL"] ?? DEFAULT_WEB_URL;
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      // Preload is built as CommonJS at `out/preload/index.cjs`.
      // sandbox: false + contextIsolation: true is the right combo
      // when preload needs to expose IPC bridges. Renderer (the
      // hosted web app) is fully isolated; only the typed bridge
      // is reachable from the page.
      preload: join(__dirname, "../preload/index.cjs"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  window.once("ready-to-show", () => window.show());

  // Open external links (http(s) outside our origin) in the user's
  // default browser. Keeps the desktop as a single-window shell.
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  const url = resolveWebUrl();
  void window.loadURL(url);

  // Auto-open DevTools when pointing at a local dev server so we
  // can see web app errors live.
  if (url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1")) {
    window.webContents.once("dom-ready", () => {
      window.webContents.openDevTools({ mode: "right" });
    });
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
  // menubar icon can re-paint.
  ipcMain.on("capture:state-changed", (_event, state: { recording: boolean }) => {
    setTrayRecordingState(Boolean(state?.recording), getMainWindow());
  });

  // ⌥⌘M — global shortcut to toggle the capture surface. The web
  // app interprets the event based on which page is active.
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
    console.warn("Failed to register ⌥⌘M global shortcut (already in use).");
  }

  app.on("activate", () => {
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
