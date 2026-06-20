import "server-only";
import type { Page, PageCreate, PageUpdate } from "@octofocus/shared";
import { serverApiFetch } from "./server-client";

export function listPagesApi(projectId: string) {
  return serverApiFetch<Page[]>(`/projects/${projectId}/pages`);
}

export function createPageApi(projectId: string, body: PageCreate) {
  return serverApiFetch<Page>(`/projects/${projectId}/pages`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getPageApi(pageId: string) {
  return serverApiFetch<Page>(`/pages/${pageId}`);
}

export function updatePageApi(pageId: string, body: PageUpdate) {
  return serverApiFetch<Page>(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
