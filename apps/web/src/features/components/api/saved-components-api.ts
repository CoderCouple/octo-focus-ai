import "server-only";
import { serverFetch } from "@/lib/api/server-fetch";
import type {
  PublicComponent,
  SavedComponent,
  SavedComponentCreate,
  SavedComponentUpdate,
  WorkspaceComponentSummary,
} from "../types";

export function listWorkspaceComponentsApi(workspaceId: string) {
  return serverFetch<WorkspaceComponentSummary[]>(
    `/workspaces/${workspaceId}/saved-components`,
  );
}

export function getSavedComponentApi(id: string) {
  return serverFetch<SavedComponent>(`/saved-components/${id}`);
}

export function createSavedComponentApi(workspaceId: string, body: SavedComponentCreate) {
  return serverFetch<SavedComponent>(`/workspaces/${workspaceId}/saved-components`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateSavedComponentApi(id: string, body: SavedComponentUpdate) {
  return serverFetch<SavedComponent>(`/saved-components/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteSavedComponentApi(id: string) {
  return serverFetch<SavedComponent>(`/saved-components/${id}`, { method: "DELETE" });
}

/**
 * Unauthenticated public read for the /c/<id> route. `serverFetch`
 * tolerates missing sessions (it simply skips the bearer header when
 * there isn't one), so visitors without an account still hit the
 * public endpoint cleanly.
 */
export function getPublicComponentApi(id: string) {
  return serverFetch<PublicComponent>(`/public/components/${id}`);
}
