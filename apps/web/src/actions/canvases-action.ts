"use server";

import { revalidatePath } from "next/cache";
import type { CanvasCreate, CanvasUpdate } from "@octofocus/shared";
import {
  createCanvasApi,
  deleteCanvasApi,
  getCanvasApi,
  listCanvasesApi,
  updateCanvasApi,
} from "@/api/canvases-api";

export async function renameCanvasAction(canvasId: string, title: string) {
  const row = await updateCanvasApi(canvasId, { title });
  revalidatePath("/app/canvas");
  return row;
}

export async function deleteCanvasAction(canvasId: string) {
  await deleteCanvasApi(canvasId);
  revalidatePath("/app/canvas");
}

export async function listCanvasesAction(projectId: string) {
  return listCanvasesApi(projectId);
}

export async function createCanvasAction(projectId: string, body: CanvasCreate) {
  return createCanvasApi(projectId, body);
}

export async function getCanvasAction(canvasId: string) {
  return getCanvasApi(canvasId);
}

export async function updateCanvasAction(canvasId: string, body: CanvasUpdate) {
  return updateCanvasApi(canvasId, body);
}
