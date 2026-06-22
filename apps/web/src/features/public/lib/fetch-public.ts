/**
 * Server-side fetchers for the public reading surface. These are special
 * compared to the rest of the api in that:
 *
 *   - they don't carry the viewer's Supabase JWT — public reads are
 *     anonymous on purpose
 *   - they cache: `/p/<workspace>/<slug>` is revalidated every 60s and
 *     tagged so a publish action can invalidate it surgically
 *
 * Used by the (public) routes and the /invite acceptance page.
 */
import "server-only";
import { unwrapBaseResponse } from "@/lib/api/base-response";
import { env } from "@/lib/env";
import type { PublicResource, ShareTokenResource } from "../types";

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
