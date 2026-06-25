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

/**
 * Projects always have a note AND a canvas. createProjectAction always
 * seeds both children so the "shape" of a project is a single shape
 * (note + canvas split view). The "New note" and "New canvas" buttons
 * on /workspace/notes and /workspace/canvas call this same action — the
 * caller decides which mode the project view should open in via a
 * `?mode=notes|canvas|both` query param.
 *
 * Legacy projects that pre-date this rule may still have only one pane;
 * the split view tolerates nulls so they stay viewable.
 */
export async function createProjectAction(workspaceId: string, body: ProjectCreate) {
  return runAction(async () => {
    const project = await createProjectApi(workspaceId, body);
    await Promise.all([
      createNoteApi(project.id, { title: project.name }),
      createCanvasApi(project.id, { title: project.name }),
    ]);
    revalidatePath("/workspace");
    revalidatePath("/workspace/projects");
    revalidatePath("/workspace/notes");
    revalidatePath("/workspace/canvas");
    return project;
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
