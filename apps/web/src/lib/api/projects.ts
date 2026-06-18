import type { Project, ProjectCreate } from "@octofocus/shared";
import { browserApiFetch } from "./browser";

export function listProjects(workspaceId: string) {
  return browserApiFetch<Project[]>(`/workspaces/${workspaceId}/projects`);
}

export function createProject(workspaceId: string, body: ProjectCreate) {
  return browserApiFetch<Project>(`/workspaces/${workspaceId}/projects`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
