/**
 * Thin desktop API client. Pulls the Bearer token from the keychain
 * on every call (lazy fetch — the main process owns the token, the
 * renderer never caches it long-term) and adds it to the Auth
 * header.
 *
 * Errors surface as thrown Error instances with the message taken
 * from the API's BaseResponse envelope where present, otherwise the
 * raw status. The caller decides what to toast.
 */

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:4000/v1";

export interface BaseResponseEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
}

async function fetchWithAuth<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await window.octofocus.token.get();
  if (!token) {
    throw new Error("Not signed in. Add an API token in Settings.");
  }
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  if (!headers.has("content-type") && init.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const body = (await res.json().catch(() => null)) as BaseResponseEnvelope<T> | null;
  if (!res.ok) {
    const message =
      body && typeof body === "object" && typeof body.message === "string"
        ? body.message
        : `${res.status}`;
    throw new Error(`OctoFocusAI API ${path} ${res.status}: ${message}`);
  }
  // API wraps everything in a `BaseResponse` envelope; tolerate raw
  // payloads too (some endpoints return body directly).
  if (body && typeof body === "object" && "success" in body && body.data !== undefined) {
    return body.data as T;
  }
  return body as T;
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
  return fetchWithAuth<MeResponse>("/me");
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
  return fetchWithAuth<CreateMeetingResponse>(`/workspaces/${workspaceId}/meetings`, {
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
  return fetchWithAuth(`/meetings/${id}`, {
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
  return fetchWithAuth<{ summary: string | null }>(`/meetings/${id}/summarize`, {
    method: "POST",
  });
}

/**
 * Upload the final audio blob. The API's raw-body parser expects an
 * `application/octet-stream`-style body + the audio metadata in
 * custom headers — see services/api/.../meetings.controller.ts.
 */
export async function uploadMeetingAudio(
  id: string,
  blob: Blob,
  durationSec?: number,
): Promise<void> {
  const token = await window.octofocus.token.get();
  if (!token) throw new Error("Not signed in.");
  const headers = new Headers({
    authorization: `Bearer ${token}`,
    "content-type": "application/octet-stream",
    "x-audio-content-type": blob.type || "audio/webm",
  });
  if (durationSec !== undefined && Number.isFinite(durationSec)) {
    headers.set("x-audio-duration-sec", String(Math.floor(durationSec)));
  }
  const res = await fetch(`${API_URL}/meetings/${id}/audio`, {
    method: "POST",
    headers,
    body: await blob.arrayBuffer(),
  });
  if (!res.ok) {
    throw new Error(`Audio upload failed (${res.status})`);
  }
}
