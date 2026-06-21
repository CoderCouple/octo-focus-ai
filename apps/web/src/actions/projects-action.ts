"use server";

import { revalidatePath } from "next/cache";
import type { ProjectCreate } from "@octofocus/shared";
import {
  createProjectApi,
  deleteProjectApi,
  getProjectApi,
  listProjectsApi,
  updateProjectApi,
} from "@/api/projects-api";

export async function listProjectsAction(workspaceId: string) {
  return listProjectsApi(workspaceId);
}

export async function createProjectAction(workspaceId: string, body: ProjectCreate) {
  return createProjectApi(workspaceId, body);
}

export async function getProjectAction(projectId: string) {
  return getProjectApi(projectId);
}

export async function renameProjectAction(projectId: string, name: string) {
  const row = await updateProjectApi(projectId, { name });
  revalidatePath("/app");
  return row;
}

export async function deleteProjectAction(projectId: string) {
  await deleteProjectApi(projectId);
  revalidatePath("/app");
}
