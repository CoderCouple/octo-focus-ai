"use server";

import type { ProjectCreate } from "@octofocus/shared";
import { createProjectApi, listProjectsApi } from "@/api/projects-api";

export async function listProjectsAction(workspaceId: string) {
  return listProjectsApi(workspaceId);
}

export async function createProjectAction(workspaceId: string, body: ProjectCreate) {
  return createProjectApi(workspaceId, body);
}
