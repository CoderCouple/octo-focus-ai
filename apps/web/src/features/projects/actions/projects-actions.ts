"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/lib/api/action";
import {
  createProjectApi,
  deleteProjectApi,
  getProjectApi,
  listProjectsApi,
  updateProjectApi,
} from "../api/projects-api";
import type { ProjectCreate } from "../types";

export async function listProjectsAction(workspaceId: string) {
  return runAction(() => listProjectsApi(workspaceId));
}

export async function getProjectAction(projectId: string) {
  return runAction(() => getProjectApi(projectId));
}

export async function createProjectAction(workspaceId: string, body: ProjectCreate) {
  return runAction(async () => {
    const row = await createProjectApi(workspaceId, body);
    revalidatePath("/app");
    return row;
  });
}

export async function renameProjectAction(projectId: string, name: string) {
  return runAction(async () => {
    const row = await updateProjectApi(projectId, { name });
    revalidatePath("/app");
    return row;
  });
}

export async function deleteProjectAction(projectId: string) {
  return runAction(async () => {
    await deleteProjectApi(projectId);
    revalidatePath("/app");
  });
}
