import "server-only";
import { serverFetch } from "@/lib/api/server-fetch";
import type { Page, PageCreate, PageUpdate, WorkspacePageSummary } from "../types";

export function listWorkspaceNotesApi(workspaceId: string) {
  return serverFetch<WorkspacePageSummary[]>(`/workspaces/${workspaceId}/pages`);
}

export function listProjectNotesApi(projectId: string) {
  return serverFetch<Page[]>(`/projects/${projectId}/pages`);
}

export function getNoteApi(pageId: string) {
  return serverFetch<Page>(`/pages/${pageId}`);
}

export function createNoteApi(projectId: string, body: PageCreate) {
  return serverFetch<Page>(`/projects/${projectId}/pages`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateNoteApi(pageId: string, body: PageUpdate) {
  return serverFetch<Page>(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteNoteApi(pageId: string) {
  return serverFetch<Page>(`/pages/${pageId}`, { method: "DELETE" });
}
