import "server-only";
import { serverFetch } from "@/lib/api/server-fetch";
import type {
  Canvas,
  CanvasCreate,
  CanvasUpdate,
  WorkspaceCanvasSummary,
} from "../types";

export function listWorkspaceCanvasesApi(workspaceId: string) {
  return serverFetch<WorkspaceCanvasSummary[]>(`/workspaces/${workspaceId}/canvases`);
}

export function listProjectCanvasesApi(projectId: string) {
  return serverFetch<Canvas[]>(`/projects/${projectId}/canvases`);
}

export function getCanvasApi(canvasId: string) {
  return serverFetch<Canvas>(`/canvases/${canvasId}`);
}

export function createCanvasApi(projectId: string, body: CanvasCreate) {
  return serverFetch<Canvas>(`/projects/${projectId}/canvases`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateCanvasApi(canvasId: string, body: CanvasUpdate) {
  return serverFetch<Canvas>(`/canvases/${canvasId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteCanvasApi(canvasId: string) {
  return serverFetch<Canvas>(`/canvases/${canvasId}`, { method: "DELETE" });
}
