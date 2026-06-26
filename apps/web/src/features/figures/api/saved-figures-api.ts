import "server-only";
import { serverFetch } from "@/lib/api/server-fetch";
import type {
  PublicFigure,
  SavedFigure,
  SavedFigureCreate,
  SavedFigureUpdate,
  WorkspaceFigureSummary,
} from "../types";

export function listWorkspaceFiguresApi(workspaceId: string) {
  return serverFetch<WorkspaceFigureSummary[]>(`/workspaces/${workspaceId}/saved-figures`);
}

export function getSavedFigureApi(id: string) {
  return serverFetch<SavedFigure>(`/saved-figures/${id}`);
}

export function createSavedFigureApi(workspaceId: string, body: SavedFigureCreate) {
  return serverFetch<SavedFigure>(`/workspaces/${workspaceId}/saved-figures`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateSavedFigureApi(id: string, body: SavedFigureUpdate) {
  return serverFetch<SavedFigure>(`/saved-figures/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteSavedFigureApi(id: string) {
  return serverFetch<SavedFigure>(`/saved-figures/${id}`, { method: "DELETE" });
}

/**
 * Unauthenticated public read for the /f/<id> route. `serverFetch`
 * tolerates missing sessions, so visitors without an account hit the
 * public endpoint cleanly.
 */
export function getPublicFigureApi(id: string) {
  return serverFetch<PublicFigure>(`/public/figures/${id}`);
}
