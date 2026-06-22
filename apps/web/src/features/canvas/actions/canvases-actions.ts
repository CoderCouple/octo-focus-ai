"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/lib/api/action";
import {
  createCanvasApi,
  deleteCanvasApi,
  getCanvasApi,
  listProjectCanvasesApi,
  listWorkspaceCanvasesApi,
  updateCanvasApi,
} from "../api/canvases-api";
import type { CanvasCreate, CanvasUpdate } from "../types";

export async function listWorkspaceCanvasesAction(workspaceId: string) {
  return runAction(() => listWorkspaceCanvasesApi(workspaceId));
}

export async function listProjectCanvasesAction(projectId: string) {
  return runAction(() => listProjectCanvasesApi(projectId));
}

export async function getCanvasAction(canvasId: string) {
  return runAction(() => getCanvasApi(canvasId));
}

export async function createCanvasAction(projectId: string, body: CanvasCreate) {
  return runAction(async () => {
    const row = await createCanvasApi(projectId, body);
    revalidatePath("/app/canvas");
    return row;
  });
}

export async function updateCanvasAction(canvasId: string, body: CanvasUpdate) {
  return runAction(() => updateCanvasApi(canvasId, body));
}

export async function renameCanvasAction(canvasId: string, title: string) {
  return runAction(async () => {
    const row = await updateCanvasApi(canvasId, { title });
    revalidatePath("/app/canvas");
    return row;
  });
}

export async function deleteCanvasAction(canvasId: string) {
  return runAction(async () => {
    await deleteCanvasApi(canvasId);
    revalidatePath("/app/canvas");
  });
}
