/**
 * Renderer-side API client. Every request goes through
 * `window.octofocus.api.request(...)` which is implemented in the
 * Electron main process — see `apps/desktop/src/main/api-proxy.ts`.
 * That layer handles:
 *   - CORS bypass (Node fetch has no CORS)
 *   - Remote-first / local-fallback base URL resolution
 *   - Bearer token attachment from the macOS Keychain
 *
 * The renderer never directly touches `fetch` or the token. Errors
 * surface as thrown Errors with the message taken from the API's
 * BaseResponse envelope where present.
 */

export interface BaseResponseEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface FetchOptions {
  method?: string;
  body?: string | ArrayBuffer | Uint8Array;
  headers?: Record<string, string>;
  authenticated?: boolean;
}

async function call<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const res = await window.octofocus.api.request({
    path,
    method: opts.method,
    body: opts.body,
    headers: opts.headers,
    authenticated: opts.authenticated,
  });
  // Bodies are returned as text. Most endpoints return JSON; tolerate
  // the rare empty body (e.g. 204 No Content).
  let parsed: BaseResponseEnvelope<T> | T | null = null;
  if (res.body) {
    try {
      parsed = JSON.parse(res.body) as BaseResponseEnvelope<T>;
    } catch {
      parsed = null;
    }
  }
  if (!res.ok) {
    const message =
      parsed &&
      typeof parsed === "object" &&
      "message" in parsed &&
      typeof (parsed as { message?: unknown }).message === "string"
        ? ((parsed as { message: string }).message)
        : `${res.status}`;
    throw new Error(`OctoFocusAI API ${path} ${res.status}: ${message}`);
  }
  if (
    parsed &&
    typeof parsed === "object" &&
    "success" in parsed &&
    (parsed as BaseResponseEnvelope<T>).data !== undefined
  ) {
    return (parsed as BaseResponseEnvelope<T>).data as T;
  }
  return parsed as T;
}

// ----- Domain calls ---------------------------------------------------------

export interface MeResponse {
  user: { id: string; email: string; name: string };
  memberships: Array<{
    workspace: { id: string; slug: string; name: string };
    role: "OWNER" | "ADMIN" | "MEMBER";
  }>;
}

export function getMe(): Promise<MeResponse> {
  return call<MeResponse>("/me");
}

export interface CreateMeetingResponse {
  id: string;
  title: string;
  workspaceId: string;
}

export function createMeeting(
  workspaceId: string,
  body: { title: string; description?: string | null },
): Promise<CreateMeetingResponse> {
  return call<CreateMeetingResponse>(`/workspaces/${workspaceId}/meetings`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * PATCH a partial update onto a meeting. Used at end-of-capture to
 * write the final transcript (and later the AI summary, once PR4's
 * /summarize endpoint kicks an ai_run that writes back here).
 */
export function patchMeeting(
  id: string,
  patch: { title?: string; transcript?: string; summary?: string },
): Promise<unknown> {
  return call(`/meetings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

/**
 * Trigger Claude summarization for the meeting's current transcript.
 * Synchronous round-trip — returns the meeting row with the new
 * `summary` field populated.
 */
export function summarizeMeeting(id: string): Promise<{ summary: string | null }> {
  return call<{ summary: string | null }>(`/meetings/${id}/summarize`, {
    method: "POST",
  });
}

/**
 * Upload the final audio blob. Routed through the main-process proxy
 * like every other call — the body is sent as an ArrayBuffer (IPC
 * deep-copies it into the main process, then main streams to the
 * API).
 */
export async function uploadMeetingAudio(
  id: string,
  blob: Blob,
  durationSec?: number,
): Promise<void> {
  const buf = await blob.arrayBuffer();
  const headers: Record<string, string> = {
    "content-type": "application/octet-stream",
    "x-audio-content-type": blob.type || "audio/webm",
  };
  if (durationSec !== undefined && Number.isFinite(durationSec)) {
    headers["x-audio-duration-sec"] = String(Math.floor(durationSec));
  }
  await call(`/meetings/${id}/audio`, {
    method: "POST",
    body: buf,
    headers,
  });
}
