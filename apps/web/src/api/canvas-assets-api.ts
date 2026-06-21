/**
 * Browser-side helpers for canvas exports — SVG/PNG image assets that get
 * their own public URL (and a copyable markdown snippet for embedding in
 * BlockNote notes).
 */
import { env } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type Visibility = "private" | "unlisted" | "workspace" | "public";
export type CanvasAssetFormat = "svg" | "png";

export interface CanvasAsset {
  id: string;
  canvasId: string;
  publicSlug: string;
  visibility: Visibility;
  format: CanvasAssetFormat;
  contentType: string;
  width: number | null;
  height: number | null;
  title: string | null;
  createdAt: string;
  revokedAt: string | null;
  url: string;
  markdown: string;
}

export interface CanvasAssetCreateInput {
  format: CanvasAssetFormat;
  /** base64-encoded payload (no `data:` prefix needed but accepted) */
  content: string;
  contentType: string;
  width?: number;
  height?: number;
  title?: string;
  visibility?: Visibility;
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
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

export function createCanvasExportApi(
  canvasId: string,
  body: CanvasAssetCreateInput,
): Promise<CanvasAsset> {
  return apiFetch<CanvasAsset>(`/canvases/${canvasId}/exports`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listCanvasExportsApi(canvasId: string): Promise<CanvasAsset[]> {
  return apiFetch<CanvasAsset[]>(`/canvases/${canvasId}/exports`);
}

export function revokeCanvasExportApi(assetId: string): Promise<CanvasAsset> {
  return apiFetch<CanvasAsset>(`/canvas-exports/${assetId}`, { method: "DELETE" });
}
