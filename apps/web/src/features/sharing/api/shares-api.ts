/**
 * Browser-side fetchers for the share + publish flows. Called from the
 * SharePopover client component during click handlers, so this file is
 * intentionally not `server-only`.
 */
import { env } from "@/lib/env";
import { unwrapBaseResponse } from "@/lib/api/base-response";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  PublishedResource,
  ResourceKind,
  ResourceShare,
  SharePermission,
  ShareLink,
  Visibility,
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
  return clientFetch<PublishedResource>(`/${endpoint}/${id}/publish`, {
    method: "PATCH",
    body: JSON.stringify({ visibility }),
  });
}

export function listSharesApi(kind: ResourceKind, id: string): Promise<ResourceShare[]> {
  return clientFetch<ResourceShare[]>(`/shares?kind=${kind}&id=${encodeURIComponent(id)}`);
}

export function createShareApi(input: {
  resourceKind: ResourceKind;
  resourceId: string;
  grantedToUserId?: string;
  grantedToEmail?: string;
  permission: SharePermission;
}): Promise<ResourceShare> {
  return clientFetch<ResourceShare>("/shares", { method: "POST", body: JSON.stringify(input) });
}

export function revokeShareApi(id: string): Promise<ResourceShare> {
  return clientFetch<ResourceShare>(`/shares/${id}`, { method: "DELETE" });
}

export function resendInviteApi(id: string): Promise<{ ok: true }> {
  return clientFetch<{ ok: true }>(`/shares/${id}/resend`, { method: "POST" });
}

export function listShareLinksApi(kind: ResourceKind, id: string): Promise<ShareLink[]> {
  return clientFetch<ShareLink[]>(`/share-links?kind=${kind}&id=${encodeURIComponent(id)}`);
}

export function createShareLinkApi(input: {
  resourceKind: ResourceKind;
  resourceId: string;
  permission: SharePermission;
  password?: string;
  expiresAt?: string;
}): Promise<ShareLink> {
  return clientFetch<ShareLink>("/share-links", { method: "POST", body: JSON.stringify(input) });
}

export function revokeShareLinkApi(id: string): Promise<ShareLink> {
  return clientFetch<ShareLink>(`/share-links/${id}`, { method: "DELETE" });
}
