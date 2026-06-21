import { env } from "@/lib/env";
import { unwrapBaseResponse } from "./base-response";

export type PublicResource =
  | {
      kind: "project";
      workspaceSlug: string;
      data: ProjectData;
      page: PageData | null;
      canvas: CanvasData | null;
    }
  | { kind: "page"; workspaceSlug: string; data: PageData }
  | { kind: "canvas"; workspaceSlug: string; data: CanvasData };

export interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  publicSlug: string;
  visibility: string;
  publishedAt: string | null;
  lastPublishedAt: string | null;
  settings: Record<string, unknown>;
}

export interface PageData {
  id: string;
  projectId: string;
  title: string;
  document: unknown;
  contentMd: string;
  publicSlug: string;
  visibility: string;
  publishedAt: string | null;
  lastPublishedAt: string | null;
  settings: { font?: "sans" | "serif" | "mono"; lineWidth?: string };
}

export interface CanvasData {
  id: string;
  projectId: string;
  title: string;
  document: unknown;
  diagramSchema: unknown;
  publicSlug: string;
  visibility: string;
  publishedAt: string | null;
  lastPublishedAt: string | null;
  settings: Record<string, unknown>;
}

const REVALIDATE_SECONDS = 60;

export async function fetchPublicBySlug(
  workspaceSlug: string,
  slug: string,
): Promise<PublicResource | null> {
  const res = await fetch(
    `${env.API_URL}/public/p/${encodeURIComponent(workspaceSlug)}/${encodeURIComponent(slug)}`,
    { next: { revalidate: REVALIDATE_SECONDS, tags: [`public:${workspaceSlug}:${slug}`] } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Public fetch failed (${res.status})`);
  return unwrapBaseResponse<PublicResource>(await res.json(), "/public/p/...");
}

export interface ShareTokenResource {
  kind: "project" | "page" | "canvas";
  permission: "viewer" | "commenter" | "editor" | "admin";
  data: ProjectData | PageData | CanvasData;
}

export async function fetchByShareToken(
  token: string,
  password?: string,
): Promise<{ resource: ShareTokenResource | null; needsPassword: boolean }> {
  const res = await fetch(`${env.API_URL}/public/share/${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
    cache: "no-store",
  });
  if (res.status === 401) return { resource: null, needsPassword: true };
  if (res.status === 404) return { resource: null, needsPassword: false };
  if (!res.ok) throw new Error(`Share fetch failed (${res.status})`);
  const resource = unwrapBaseResponse<ShareTokenResource>(await res.json(), "/public/share/...");
  return { resource, needsPassword: false };
}
