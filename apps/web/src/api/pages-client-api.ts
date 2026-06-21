/**
 * Browser-side calls for incremental page updates.
 * Server components keep using @/api/pages-api for fetches.
 */
import { env } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Page, PageSettings, PageUpdate } from "@octofocus/shared";

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
  if (!res.ok) throw new Error(`API ${path} ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export function updatePageClientApi(pageId: string, body: PageUpdate): Promise<Page> {
  return clientFetch<Page>(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function updatePageSettingsApi(pageId: string, settings: PageSettings): Promise<Page> {
  return updatePageClientApi(pageId, { settings });
}
