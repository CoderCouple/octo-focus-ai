import "server-only";
import type { Canvas, CanvasCreate, CanvasUpdate } from "@octofocus/shared";
import { serverApiFetch } from "./server-client";

export function listCanvasesApi(projectId: string) {
  return serverApiFetch<Canvas[]>(`/projects/${projectId}/canvases`);
}

export function createCanvasApi(projectId: string, body: CanvasCreate) {
  return serverApiFetch<Canvas>(`/projects/${projectId}/canvases`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getCanvasApi(canvasId: string) {
  return serverApiFetch<Canvas>(`/canvases/${canvasId}`);
}

export function updateCanvasApi(canvasId: string, body: CanvasUpdate) {
  return serverApiFetch<Canvas>(`/canvases/${canvasId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
