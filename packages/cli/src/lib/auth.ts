/**
 * Auth for the OctoFocusAI CLI.
 *
 * Only one auth artefact exists at runtime: a long-lived `oft_…` token
 * minted by the OctoFocusAI api's /me/cli-tokens endpoint. The CLI
 * never talks to Supabase directly.
 *
 * Acquisition paths:
 *   1. Browser bridge (`octofocus login`). Opens
 *      <webOrigin>/cli/connect in the user's browser; that page —
 *      using the user's existing web session — mints a token and
 *      relays it to the CLI's loopback listener.
 *   2. Env var (`OCTOFOCUS_TOKEN=oft_…`). For agents, CI, headless.
 *      Skips the config file entirely.
 *   3. `octofocus auth token create` (after step 1 or 2). Creates an
 *      additional token via the api for use elsewhere.
 *
 * Tokens don't refresh — they're revoked + re-issued. `getValidAccessToken`
 * surfaces a clear error if a stored token has been revoked or expired
 * server-side (caller sees the 401 from the next api call and re-runs
 * `octofocus login`).
 */
import { randomBytes } from "node:crypto";
import { loadConfig, saveConfig, type CliSession } from "./config.js";
import { CliError } from "./errors.js";
import { startLoopback } from "./loopback.js";

/**
 * Open the user's default browser at the given URL. Falls back to
 * printing the URL if no opener is available (e.g. headless SSH session).
 */
async function openBrowser(url: string): Promise<boolean> {
  const opener =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  try {
    const { spawn } = await import("node:child_process");
    const child = spawn(opener, [url], { stdio: "ignore", detached: true });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

/**
 * Browser → token bridge login. Starts a loopback listener, opens
 * <webOrigin>/cli/connect, waits for the relay to deliver an oft_ token,
 * persists the session.
 */
export async function loginViaBrowser(opts: {
  webOrigin: string;
  onWaiting?: (browserUrl: string) => void;
}): Promise<CliSession> {
  const state = randomBytes(16).toString("hex");
  const loopback = await startLoopback({ expectedState: state });

  const base = opts.webOrigin.replace(/\/+$/, "");
  const cb = `http://127.0.0.1:${loopback.port}/cb`;
  const browserUrl = `${base}/cli/connect?cb=${encodeURIComponent(cb)}&state=${encodeURIComponent(state)}`;

  await openBrowser(browserUrl);
  opts.onWaiting?.(browserUrl);

  let result: { token: string; email: string | null };
  try {
    result = await loopback.resultPromise;
  } finally {
    loopback.close();
  }

  const session: CliSession = {
    accessToken: result.token,
    email: result.email,
  };
  await saveConfig({ session });
  return session;
}

/**
 * Returns a usable access token for api calls. Env var wins; otherwise
 * the cached session is used; otherwise we throw a clear error.
 */
export async function getValidAccessToken(): Promise<string> {
  const envToken = process.env.OCTOFOCUS_TOKEN;
  if (envToken && envToken.length > 0) return envToken;

  const cfg = await loadConfig();
  if (!cfg.session) {
    throw new CliError(
      "Not logged in.",
      "Run `octofocus login` to authenticate, or set OCTOFOCUS_TOKEN for non-interactive use.",
    );
  }
  return cfg.session.accessToken;
}
