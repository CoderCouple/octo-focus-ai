"use server";

import type { CanvasCreate, CanvasUpdate } from "@octofocus/shared";
import {
  createCanvasApi,
  getCanvasApi,
  listCanvasesApi,
  updateCanvasApi,
} from "@/api/canvases-api";

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
