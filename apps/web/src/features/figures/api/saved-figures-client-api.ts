import { env } from "@/lib/env";
import { unwrapBaseResponse } from "@/lib/api/base-response";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  PublicFigure,
  SavedFigure,
  SavedFigureCreate,
  SavedFigureUpdate,
  WorkspaceFigureSummary,
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

export function listSavedFiguresClientApi(workspaceId: string): Promise<WorkspaceFigureSummary[]> {
  return clientFetch<WorkspaceFigureSummary[]>(`/workspaces/${workspaceId}/saved-figures`);
}

export function createSavedFigureClientApi(
  workspaceId: string,
  body: SavedFigureCreate,
): Promise<SavedFigure> {
  return clientFetch<SavedFigure>(`/workspaces/${workspaceId}/saved-figures`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateSavedFigureClientApi(
  id: string,
  body: SavedFigureUpdate,
): Promise<SavedFigure> {
  return clientFetch<SavedFigure>(`/saved-figures/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/**
 * Browser-side public read. Used by the figure BlockNote block when
 * it has a `figureId` prop — fetches the latest DSL, falls back to
 * the snapshot stored on the block on any failure.
 */
export async function getPublicFigureClientApi(id: string): Promise<PublicFigure | null> {
  try {
    const res = await fetch(`${env.API_URL}/public/figures/${encodeURIComponent(id)}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const body = await res.json().catch(() => null);
    return unwrapBaseResponse<PublicFigure>(body, `/public/figures/${id}`);
  } catch {
    return null;
  }
}
