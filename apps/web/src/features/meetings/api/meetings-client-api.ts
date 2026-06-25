/**
 * Browser-side meeting fetchers — incremental autosave on transcript /
 * summary edits, and the binary audio upload. Counterpart to the
 * server-side `meetings-api.ts`.
 */
import { env } from "@/lib/env";
import { unwrapBaseResponse } from "@/lib/api/base-response";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Meeting, MeetingUpdate } from "../types";

async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (session) headers.set("authorization", `Bearer ${session.access_token}`);
  return fetch(`${env.API_URL}${path}`, { ...init, headers });
}

async function clientFetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type") && init.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  const res = await authedFetch(path, { ...init, headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : `${res.status}`;
    throw new Error(`OctoFocusAI API ${path} ${res.status}: ${message}`);
  }
  return unwrapBaseResponse<T>(body, path);
}

export function updateMeetingClientApi(id: string, body: MeetingUpdate): Promise<Meeting> {
  return clientFetchJson<Meeting>(`/meetings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/**
 * Upload the recorded audio Blob to `POST /meetings/:id/audio`. The
 * backend stores the bytes on the meeting row and updates
 * `audioUploadedAt`. Audio MIME and optional duration ride as custom
 * headers so the server can record them.
 */
export async function uploadMeetingAudio(
  id: string,
  blob: Blob,
  durationSec?: number,
): Promise<Meeting> {
  const buf = await blob.arrayBuffer();
  const headers: Record<string, string> = {
    "content-type": "application/octet-stream",
    "x-audio-content-type": blob.type || "audio/webm",
  };
  if (durationSec !== undefined) {
    headers["x-audio-duration-sec"] = String(Math.round(durationSec));
  }
  return clientFetchJson<Meeting>(`/meetings/${id}/audio`, {
    method: "POST",
    body: buf,
    headers,
  });
}

/**
 * Convenience for the `<audio>` tag's `src`. We can't put auth in a
 * plain HTML element so we fetch with auth and create an object URL.
 */
export async function getMeetingAudioObjectUrl(id: string): Promise<string> {
  const res = await authedFetch(`/meetings/${id}/audio`, { method: "GET" });
  if (!res.ok) {
    throw new Error(`Failed to load recording (${res.status})`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
