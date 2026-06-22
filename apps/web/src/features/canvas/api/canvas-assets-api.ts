/**
 * Browser-side fetchers for canvas exports (SVG/PNG assets that get their
 * own public URL + markdown snippet). These are called from client
 * components — they can't go through `serverFetch` because they live in
 * the browser bundle and need the browser Supabase session.
 *
 * No `"server-only"` here on purpose — this file is *intentionally*
 * shippable to the client.
 */
import { env } from "@/lib/env";
import { unwrapBaseResponse } from "@/lib/api/base-response";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { CanvasAsset, CanvasAssetCreateInput } from "../types";

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

export function createCanvasExportApi(canvasId: string, body: CanvasAssetCreateInput) {
  return clientFetch<CanvasAsset>(`/canvases/${canvasId}/exports`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listCanvasExportsApi(canvasId: string) {
  return clientFetch<CanvasAsset[]>(`/canvases/${canvasId}/exports`);
}

export function revokeCanvasExportApi(assetId: string) {
  return clientFetch<CanvasAsset>(`/canvas-exports/${assetId}`, { method: "DELETE" });
}
