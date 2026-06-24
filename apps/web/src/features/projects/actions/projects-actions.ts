"use server";

import { revalidatePath } from "next/cache";
import { createCanvasApi } from "@/features/canvas/api/canvases-api";
import { createNoteApi } from "@/features/notes/api/notes-api";
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
    revalidatePath("/workspace");
    return row;
  });
}

/**
 * Three composed creation flows mapped to the three valid project
 * shapes a user can ask for from the workspace home. They all create
 * the project first, then (optionally) seed the child resources.
 */
export async function createNoteProjectAction(workspaceId: string, body: ProjectCreate) {
  return runAction(async () => {
    const project = await createProjectApi(workspaceId, body);
    await createNoteApi(project.id, { title: project.name });
    revalidatePath("/workspace");
    revalidatePath("/workspace/notes");
    return project;
  });
}

export async function createCanvasProjectAction(workspaceId: string, body: ProjectCreate) {
  return runAction(async () => {
    const project = await createProjectApi(workspaceId, body);
    await createCanvasApi(project.id, { title: project.name });
    revalidatePath("/workspace");
    revalidatePath("/workspace/canvas");
    return project;
  });
}

export async function createProjectWithBothAction(workspaceId: string, body: ProjectCreate) {
  return runAction(async () => {
    const project = await createProjectApi(workspaceId, body);
    await Promise.all([
      createNoteApi(project.id, { title: project.name }),
      createCanvasApi(project.id, { title: project.name }),
    ]);
    revalidatePath("/workspace");
    revalidatePath("/workspace/notes");
    revalidatePath("/workspace/canvas");
    return project;
  });
}

/**
 * Add a note or canvas to an existing project (used by the project
 * split view's "Add canvas" / "Add note" affordance when one side is
 * missing). Revalidates the project route so the page re-renders with
 * the new child mounted.
 */
export async function addNoteToProjectAction(projectId: string, title: string) {
  return runAction(async () => {
    const row = await createNoteApi(projectId, { title });
    revalidatePath(`/workspace/projects/${projectId}`);
    revalidatePath("/workspace");
    revalidatePath("/workspace/notes");
    return row;
  });
}

export async function addCanvasToProjectAction(projectId: string, title: string) {
  return runAction(async () => {
    const row = await createCanvasApi(projectId, { title });
    revalidatePath(`/workspace/projects/${projectId}`);
    revalidatePath("/workspace");
    revalidatePath("/workspace/canvas");
    return row;
  });
}

export async function renameProjectAction(projectId: string, name: string) {
  return runAction(async () => {
    const row = await updateProjectApi(projectId, { name });
    revalidatePath("/workspace");
    return row;
  });
}

export async function deleteProjectAction(projectId: string) {
  return runAction(async () => {
    await deleteProjectApi(projectId);
    revalidatePath("/workspace");
  });
}
