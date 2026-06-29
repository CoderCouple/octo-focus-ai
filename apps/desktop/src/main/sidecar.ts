/**
 * Spawns the `mac-audio-capture` Swift binary as a child process,
 * pipes its stdout (16 kHz mono int16 PCM frames) to the renderer
 * via IPC events, and tears the process down cleanly when the
 * renderer asks to stop.
 *
 * stderr is the sidecar's human-readable log channel — forwarded to
 * the Electron main process console for diagnostics.
 *
 * Lifecycle invariant: at most one sidecar runs at a time. A second
 * `start` request kills the existing one first.
 */
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { app, BrowserWindow } from "electron";

let currentChild: ChildProcessWithoutNullStreams | null = null;

function resolveBinaryPath(): string {
  // Dev: built by `swift build -c release` in the native folder.
  // Prod: packaged inside the app bundle (PR6 will copy it to
  // Resources/ via electron-builder's `extraResources`).
  const devPath = join(
    app.getAppPath(),
    "native/mac-audio-capture/.build/release/MacAudioCapture",
  );
  if (existsSync(devPath)) return devPath;
  const prodPath = join(process.resourcesPath, "mac-audio-capture", "MacAudioCapture");
  return prodPath;
}

export interface SidecarStartResult {
  pid: number;
  binaryPath: string;
}

export function startSidecar(window: BrowserWindow): SidecarStartResult {
  stopSidecar();

  const binaryPath = resolveBinaryPath();
  if (!existsSync(binaryPath)) {
    throw new Error(
      `mac-audio-capture binary not found at ${binaryPath}. Build with: cd apps/desktop/native/mac-audio-capture && swift build -c release`,
    );
  }

  const child = spawn(binaryPath, [], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  currentChild = child;

  // PCM stream → renderer. We forward raw Buffers; the renderer
  // unboxes them and ships straight to Deepgram.
  child.stdout.on("data", (chunk: Buffer) => {
    if (window.isDestroyed()) return;
    // `webContents.send` deep-copies the payload across the IPC
    // bridge — fine for our 3.2KB/100ms cadence (≈32 KB/s).
    window.webContents.send("sidecar:chunk", chunk);
  });

  // Human-readable diagnostics — log to console + relay important
  // messages (e.g. permission denied) to the renderer as events.
  child.stderr.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf8");
    console.log("[sidecar]", text.trim());
    if (window.isDestroyed()) return;
    window.webContents.send("sidecar:log", text);
  });

  child.on("exit", (code, signal) => {
    if (currentChild === child) currentChild = null;
    if (!window.isDestroyed()) {
      window.webContents.send("sidecar:exit", { code, signal });
    }
  });

  child.on("error", (err) => {
    console.error("[sidecar]", err);
    if (!window.isDestroyed()) {
      window.webContents.send("sidecar:error", { message: err.message });
    }
  });

  return { pid: child.pid ?? -1, binaryPath };
}

export function stopSidecar(): void {
  if (!currentChild) return;
  try {
    // The Swift binary watches stdin for EOF as its "stop" signal.
    // Closing stdin is cleaner than SIGTERM — gives the binary a
    // chance to flush remaining samples before exit.
    currentChild.stdin.end();
    setTimeout(() => {
      if (currentChild && !currentChild.killed) currentChild.kill("SIGTERM");
    }, 500);
  } catch {
    // ignore — already exited
  }
}

export function isSidecarRunning(): boolean {
  return currentChild !== null && !currentChild.killed;
}
