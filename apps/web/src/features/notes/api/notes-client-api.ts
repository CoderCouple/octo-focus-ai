/**
 * Browser-side fetcher for incremental note updates from the editor
 * (font/lineWidth toggles in `notes-pane`, autosave from the BlockNote
 * editor). Server components keep using the matching server fetchers in
 * `notes-api.ts`. Not server-only — intentionally part of the client
 * bundle.
 */
import type { PageSettings } from "@octofocus/shared";
import { env } from "@/lib/env";
import { unwrapBaseResponse } from "@/lib/api/base-response";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Page, PageUpdate } from "../types";

async function clientFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (!headers.has("content-type") && init.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  if (session) headers.set("authorization", `Bearer ${session.access_token}`);
  const res = await fetch(`${env.API_URL}${path}`, { ...init, headers });
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

export function updateNoteClientApi(pageId: string, body: PageUpdate): Promise<Page> {
  return clientFetch<Page>(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function updateNoteSettingsApi(pageId: string, settings: PageSettings): Promise<Page> {
  return updateNoteClientApi(pageId, { settings });
}
