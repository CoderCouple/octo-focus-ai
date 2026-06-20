"use server";

import type { ProjectCreate } from "@octofocus/shared";
import { createProjectApi, getProjectApi, listProjectsApi } from "@/api/projects-api";

export async function listProjectsAction(workspaceId: string) {
  return listProjectsApi(workspaceId);
}

export async function createProjectAction(workspaceId: string, body: ProjectCreate) {
  return createProjectApi(workspaceId, body);
}

export async function getProjectAction(projectId: string) {
  return getProjectApi(projectId);
}
