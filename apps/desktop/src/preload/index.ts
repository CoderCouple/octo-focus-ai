/**
 * Preload script — runs inside the BrowserWindow's renderer (which
 * loads the hosted OctoFocusAI web app at `https://www.octofocus.ai`
 * or the local dev server). Exposes a small typed bridge on
 * `window.octofocus` that the web app's `MeetingRecorder` reads to
 * decide whether it should use the browser `MediaRecorder` (no
 * bridge) or the Swift sidecar (bridge present).
 *
 * No auth, no API client — Supabase cookies inside the BrowserWindow
 * handle that. The bridge is intentionally tiny: capture lifecycle,
 * shortcut subscription, isElectron flag.
 */
import { contextBridge, ipcRenderer } from "electron";
import type { OctofocusBridge } from "../shared/preload-api";

const api: OctofocusBridge = {
  isElectron: true,
  platform: process.platform,

  /**
   * Audio capture bridge — the Swift sidecar lives in the main
   * process. Renderer subscribes to PCM chunks via `onChunk`; each
   * chunk is a 100 ms slice of 16 kHz mono int16 PCM ready for
   * Deepgram.
   */
  capture: {
    start: () =>
      ipcRenderer.invoke("capture:start") as Promise<{
        pid: number;
        binaryPath: string;
      }>,
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
   * dispatches the toggle event over IPC; the web app interprets
   * the event based on the current page state.
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
