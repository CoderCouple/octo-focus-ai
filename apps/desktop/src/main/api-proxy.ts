/**
 * API proxy — every renderer-side API call rides through this main
 * process handler. Two reasons:
 *
 *   1. **No CORS.** Node's fetch doesn't enforce browser CORS, so
 *      the renderer's origin (Vite dev server, or `app://` in
 *      production) never has to match the API's `Access-Control-
 *      Allow-Origin`. Without this proxy, every API call from the
 *      dev renderer is blocked at preflight.
 *
 *   2. **Single base-URL fallback.** Probes remote first, falls
 *      back to local on connection error, memoises the choice for
 *      the session. The renderer never has to know which base
 *      ended up serving it.
 *
 * Token resolution is also here — the main process pulls the
 * Bearer token from the macOS Keychain on every authenticated
 * request, so the renderer never sees the credential.
 */
import { ipcMain } from "electron";
import { getStoredToken } from "./token-store";

// The NestJS API doesn't use a `/v1` URL prefix (controllers mount
// at the root path), so the base URL is host-only. The path each
// call passes — `/me`, `/meetings/:id`, etc. — matches the
// controller `@Controller(...)` decorators directly.
const REMOTE_DEFAULT = process.env["OCTOFOCUS_API_REMOTE"] ?? "https://api.octofocus.ai";
const LOCAL_DEFAULT = process.env["OCTOFOCUS_API_LOCAL"] ?? "http://localhost:4000";

let resolvedBase: string | null = null;

interface NodeFetchError {
  cause?: { code?: string };
  code?: string;
}

function isConnectionFailure(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const e = err as Error & NodeFetchError;
  const code = e.cause?.code ?? e.code;
  if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ETIMEDOUT") {
    return true;
  }
  return /fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(err.message);
}

async function probeBase(): Promise<string> {
  if (resolvedBase) return resolvedBase;
  try {
    // HEAD the root just to test reachability; we don't care about
    // the response, only that the socket connects.
    await fetch(REMOTE_DEFAULT, { method: "HEAD" });
    resolvedBase = REMOTE_DEFAULT;
  } catch (err) {
    if (isConnectionFailure(err)) {
      console.warn(`[api-proxy] remote ${REMOTE_DEFAULT} unreachable, using ${LOCAL_DEFAULT}`);
      resolvedBase = LOCAL_DEFAULT;
    } else {
      // Non-connection error (e.g. 4xx) — server is reachable;
      // stick with remote.
      resolvedBase = REMOTE_DEFAULT;
    }
  }
  return resolvedBase;
}

export interface ApiRequest {
  path: string;
  method?: string;
  /** JSON-stringified body, or ArrayBuffer for binary uploads. */
  body?: string | ArrayBuffer | Uint8Array;
  headers?: Record<string, string>;
  /** Defaults to true. When false, no Bearer token is attached. */
  authenticated?: boolean;
}

export interface ApiResponse {
  ok: boolean;
  status: number;
  /** Response body as text. Caller JSON-parses if expected. */
  body: string;
  /** Which base served the request — useful for diagnostics. */
  base: string;
}

export function registerApiProxy(): void {
  ipcMain.handle("api:request", async (_event, req: ApiRequest): Promise<ApiResponse> => {
    const base = await probeBase();
    const headers: Record<string, string> = { ...(req.headers ?? {}) };

    if (req.authenticated !== false) {
      const token = await getStoredToken();
      if (!token) throw new Error("Not signed in.");
      headers["authorization"] = `Bearer ${token}`;
      // DIAGNOSTIC — shows base + token prefix (NOT the full token)
      // so we can confirm the `oft_` shape survives the keychain
      // round-trip and which API host is serving us.
      console.log(
        `[api-proxy] ${req.method ?? "GET"} ${base}${req.path} (token=${token.slice(0, 8)}…, len=${token.length})`,
      );
    }
    if (req.body && typeof req.body === "string" && !headers["content-type"]) {
      headers["content-type"] = "application/json";
    }

    // Node's global fetch accepts string | Buffer | Uint8Array as
    // body. `BodyInit` isn't in the Node typing surface so we widen
    // via `unknown`; the runtime contract is fine.
    const body =
      req.body === undefined
        ? undefined
        : typeof req.body === "string"
          ? req.body
          : Buffer.from(req.body as ArrayBuffer);

    const res = await fetch(`${base}${req.path}`, {
      method: req.method ?? "GET",
      headers,
      body: body as unknown as RequestInit["body"],
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, body: text, base };
  });
}
