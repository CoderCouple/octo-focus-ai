/**
 * Shape of the bridge exposed on `window.octofocus` by the preload
 * script. Kept in `src/shared` so the renderer + preload reference
 * the exact same type — no drift between what's exposed and what the
 * renderer assumes is available.
 *
 * PR2 grows this with typed wrappers (e.g. `getToken`, `setToken`);
 * PR3 adds `startCapture` / `stopCapture` etc.
 */
/**
 * Subset of Node `process.versions` we actually surface in the
 * renderer. Re-declared as a plain string-map so the renderer
 * tsconfig (which deliberately excludes @types/node) compiles
 * without pulling Node globals.
 */
export type ProcessVersions = Readonly<Record<string, string | undefined>>;

/**
 * `process.platform` is widened to `string` for the renderer — we
 * only ever branch on `=== "darwin"` so the exact union of Node's
 * platform strings doesn't matter, and using `string` avoids
 * coupling the renderer's types to a Node version it doesn't import.
 */
export interface TokenApi {
  /** Returns the stored Bearer token, or null when none is saved. */
  get(): Promise<string | null>;
  /** Persists a new token to the OS keychain. */
  set(token: string): Promise<void>;
  /** Clears the stored token (sign-out). */
  clear(): Promise<void>;
}

export interface OctofocusBridge {
  platform: string;
  versions: ProcessVersions;
  invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T>;
  token: TokenApi;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    octofocus: OctofocusBridge;
  }
}

export {};
