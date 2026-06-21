import { env } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { unwrapBaseResponse } from "./base-response";

export type Visibility = "private" | "unlisted" | "workspace" | "public";
export type SharePermission = "viewer" | "commenter" | "editor" | "admin";
export type ResourceKind = "project" | "page" | "canvas";

export interface PublishedResource {
  resourceKind: ResourceKind;
  resourceId: string;
  publicSlug: string;
  visibility: Visibility;
  publishedAt: string | null;
  lastPublishedAt: string | null;
  workspaceSlug: string;
  publicUrl: string;
}

export interface ResourceShare {
  id: string;
  resourceKind: ResourceKind;
  resourceId: string;
  grantedToUserId: string | null;
  grantedToEmail: string | null;
  permission: SharePermission;
  status: "active" | "pending" | "revoked" | "expired";
  createdAt: string;
}

export interface ShareLink {
  id: string;
  resourceKind: ResourceKind;
  resourceId: string;
  token: string;
  permission: SharePermission;
  hasPassword: boolean;
  expiresAt: string | null;
  url: string;
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
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : `${res.status}`;
    throw new Error(`API ${path} ${res.status}: ${message}`);
  }
  return unwrapBaseResponse<T>(body, path);
}

export function publishResourceApi(
  kind: ResourceKind,
  id: string,
  visibility: Visibility,
): Promise<PublishedResource> {
  const endpoint = kind === "project" ? "projects" : kind === "page" ? "pages" : "canvases";
  return apiFetch<PublishedResource>(`/${endpoint}/${id}/publish`, {
    method: "PATCH",
    body: JSON.stringify({ visibility }),
  });
}

export function listSharesApi(kind: ResourceKind, id: string): Promise<ResourceShare[]> {
  return apiFetch<ResourceShare[]>(`/shares?kind=${kind}&id=${encodeURIComponent(id)}`);
}

export function createShareApi(input: {
  resourceKind: ResourceKind;
  resourceId: string;
  grantedToUserId?: string;
  grantedToEmail?: string;
  permission: SharePermission;
}): Promise<ResourceShare> {
  return apiFetch<ResourceShare>("/shares", { method: "POST", body: JSON.stringify(input) });
}

export function revokeShareApi(id: string): Promise<ResourceShare> {
  return apiFetch<ResourceShare>(`/shares/${id}`, { method: "DELETE" });
}

export function resendInviteApi(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/shares/${id}/resend`, { method: "POST" });
}

export function listShareLinksApi(kind: ResourceKind, id: string): Promise<ShareLink[]> {
  return apiFetch<ShareLink[]>(`/share-links?kind=${kind}&id=${encodeURIComponent(id)}`);
}

export function createShareLinkApi(input: {
  resourceKind: ResourceKind;
  resourceId: string;
  permission: SharePermission;
  password?: string;
  expiresAt?: string;
}): Promise<ShareLink> {
  return apiFetch<ShareLink>("/share-links", { method: "POST", body: JSON.stringify(input) });
}

export function revokeShareLinkApi(id: string): Promise<ShareLink> {
  return apiFetch<ShareLink>(`/share-links/${id}`, { method: "DELETE" });
}
