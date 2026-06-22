import "server-only";
import { serverFetch } from "@/lib/api/server-fetch";
import type { Project, ProjectCreate, ProjectUpdate } from "../types";

export function listProjectsApi(workspaceId: string) {
  return serverFetch<Project[]>(`/workspaces/${workspaceId}/projects`);
}

export function getProjectApi(projectId: string) {
  return serverFetch<Project>(`/projects/${projectId}`);
}

export function createProjectApi(workspaceId: string, body: ProjectCreate) {
  return serverFetch<Project>(`/workspaces/${workspaceId}/projects`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateProjectApi(projectId: string, body: ProjectUpdate) {
  return serverFetch<Project>(`/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteProjectApi(projectId: string) {
  return serverFetch<Project>(`/projects/${projectId}`, { method: "DELETE" });
}
