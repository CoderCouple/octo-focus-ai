import "server-only";
import type { Project, ProjectCreate } from "@octofocus/shared";
import { serverApiFetch } from "./server-client";

export function listProjectsApi(workspaceId: string) {
  return serverApiFetch<Project[]>(`/workspaces/${workspaceId}/projects`);
}

export function createProjectApi(workspaceId: string, body: ProjectCreate) {
  return serverApiFetch<Project>(`/workspaces/${workspaceId}/projects`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
