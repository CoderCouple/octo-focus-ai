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
