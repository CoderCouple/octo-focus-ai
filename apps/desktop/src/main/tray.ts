/**
 * Menubar / system-tray icon. Acts as the always-present surface
 * for the desktop app — clicking it toggles the main window's
 * visibility; right-click reveals a small menu (Show/Hide,
 * Recording state, Quit). The icon flips to a filled "recording"
 * variant while the sidecar is active.
 *
 * On macOS, `Tray` uses the menubar. We use template images so
 * the icon picks up the system's light/dark colour scheme
 * automatically — black on light bg, white on dark.
 */
import { app, BrowserWindow, Menu, nativeImage, Tray } from "electron";
import { join } from "node:path";

let tray: Tray | null = null;
let isRecording = false;

function iconPath(state: "idle" | "recording"): string {
  // Resources are loaded relative to the packaged app — at dev time
  // the assets sit next to the source. We ship 16x16@2x PNGs marked
  // as templates so macOS recolors them per appearance.
  // For now we fall back to an empty image if the asset is missing
  // and rely on the title label; PR6 polish ships actual icons.
  const file = state === "recording" ? "trayTemplate-rec.png" : "trayTemplate.png";
  return join(__dirname, "../assets", file);
}

function loadIcon(state: "idle" | "recording") {
  const img = nativeImage.createFromPath(iconPath(state));
  if (img.isEmpty()) {
    // No asset shipped yet — fall back to an empty image; the tray
    // title text below still renders, so the menubar entry remains
    // discoverable.
    return nativeImage.createEmpty();
  }
  img.setTemplateImage(true);
  return img;
}

function rebuildMenu(window: BrowserWindow | null): Menu {
  return Menu.buildFromTemplate([
    {
      label: isRecording ? "● Recording" : "Idle",
      enabled: false,
    },
    { type: "separator" },
    {
      label: window?.isVisible() ? "Hide" : "Show",
      click: () => {
        if (!window) return;
        if (window.isVisible()) window.hide();
        else {
          window.show();
          window.focus();
        }
      },
    },
    {
      label: "Toggle capture (⌥⌘M)",
      click: () => {
        window?.webContents.send("shortcut:toggle-capture");
      },
    },
    { type: "separator" },
    { label: "Quit OctoFocusAI", role: "quit" },
  ]);
}

export function installTray(getWindow: () => BrowserWindow | null): void {
  if (tray) return;
  tray = new Tray(loadIcon("idle"));
  tray.setToolTip("OctoFocusAI");
  // Title is a short menubar-bar label; we lean on it when the
  // icon asset is missing in dev.
  tray.setTitle("OF");
  tray.setContextMenu(rebuildMenu(getWindow()));

  tray.on("click", () => {
    const window = getWindow();
    if (!window) return;
    if (window.isVisible()) {
      window.isFocused() ? window.hide() : window.focus();
    } else {
      window.show();
      window.focus();
    }
  });
}

export function setTrayRecordingState(recording: boolean, window: BrowserWindow | null): void {
  if (!tray) return;
  isRecording = recording;
  tray.setImage(loadIcon(recording ? "recording" : "idle"));
  tray.setTitle(recording ? "● REC" : "OF");
  tray.setContextMenu(rebuildMenu(window));
}

export function disposeTray(): void {
  tray?.destroy();
  tray = null;
}

// Triggered by app.on("before-quit") to release the icon cleanly.
app.on("before-quit", disposeTray);
