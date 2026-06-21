import "server-only";
import type { Project, ProjectCreate, ProjectUpdate } from "@octofocus/shared";
import { serverApiFetch } from "./server-client";

export function updateProjectApi(projectId: string, body: ProjectUpdate) {
  return serverApiFetch<Project>(`/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteProjectApi(projectId: string) {
  return serverApiFetch<Project>(`/projects/${projectId}`, { method: "DELETE" });
}

export function listProjectsApi(workspaceId: string) {
  return serverApiFetch<Project[]>(`/workspaces/${workspaceId}/projects`);
}

export function createProjectApi(workspaceId: string, body: ProjectCreate) {
  return serverApiFetch<Project>(`/workspaces/${workspaceId}/projects`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getProjectApi(projectId: string) {
  return serverApiFetch<Project>(`/projects/${projectId}`);
}
