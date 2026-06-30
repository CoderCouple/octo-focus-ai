/**
 * Ambient declaration for the `window.octofocus` bridge that the
 * OctoFocusAI desktop shell injects via its preload script. The web
 * app uses this to detect "running inside Electron" and swap the
 * browser audio path for the Swift sidecar.
 *
 * Kept as a `.d.ts` so it pollutes nothing at runtime — pure type
 * information for the few components that touch the bridge.
 *
 * Shape mirrors `apps/desktop/src/shared/preload-api.ts`. We keep
 * this declaration local to apps/web (rather than importing from
 * the desktop package) so the web bundle doesn't take a workspace
 * dependency on the desktop one.
 */

interface OctofocusBridgeCaptureApi {
  start(): Promise<{ pid: number; binaryPath: string }>;
  stop(): Promise<void>;
  isRunning(): Promise<boolean>;
  onChunk(handler: (chunk: ArrayBuffer) => void): () => void;
  onLog(handler: (line: string) => void): () => void;
  onExit(
    handler: (info: { code: number | null; signal: string | null }) => void,
  ): () => void;
  onError(handler: (info: { message: string }) => void): () => void;
}

interface OctofocusBridgeShortcutsApi {
  onToggleCapture(handler: () => void): () => void;
  notifyCaptureState(state: { recording: boolean }): void;
}

interface OctofocusBridge {
  isElectron: true;
  platform: string;
  capture: OctofocusBridgeCaptureApi;
  shortcuts: OctofocusBridgeShortcutsApi;
}

declare global {
  interface Window {
    octofocus?: OctofocusBridge;
  }
}

export {};
