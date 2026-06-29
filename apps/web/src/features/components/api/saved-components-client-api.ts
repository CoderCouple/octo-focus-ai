import { env } from "@/lib/env";
import { unwrapBaseResponse } from "@/lib/api/base-response";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  PublicComponent,
  SavedComponent,
  SavedComponentCreate,
  SavedComponentUpdate,
} from "../types";

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

export function createSavedComponentClientApi(
  workspaceId: string,
  body: SavedComponentCreate,
): Promise<SavedComponent> {
  return clientFetch<SavedComponent>(`/workspaces/${workspaceId}/saved-components`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateSavedComponentClientApi(
  id: string,
  body: SavedComponentUpdate,
): Promise<SavedComponent> {
  return clientFetch<SavedComponent>(`/saved-components/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteSavedComponentClientApi(id: string): Promise<SavedComponent> {
  return clientFetch<SavedComponent>(`/saved-components/${id}`, {
    method: "DELETE",
  });
}

/**
 * Browser-side public read. Used by the generativeUi BlockNote block
 * when it has a `componentId` prop — fetches the latest code, falls
 * back to the snapshot stored on the block on any failure.
 */
export async function getPublicComponentClientApi(id: string): Promise<PublicComponent | null> {
  try {
    const res = await fetch(`${env.API_URL}/public/components/${encodeURIComponent(id)}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const body = await res.json().catch(() => null);
    return unwrapBaseResponse<PublicComponent>(body, `/public/components/${id}`);
  } catch {
    return null;
  }
}
