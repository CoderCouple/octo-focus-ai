"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteCanvasAction,
  listWorkspaceCanvasesAction,
  renameCanvasAction,
} from "../actions/canvases-actions";
import { canvasKeys } from "../constants";
import type { WorkspaceCanvasSummary } from "../types";

function unwrap<T>(r: { success: true; data: T } | { success: false; message: string }): T {
  if (!r.success) throw new Error(r.message);
  return r.data;
}

export function useWorkspaceCanvases(
  workspaceId: string,
  initialData?: WorkspaceCanvasSummary[],
) {
  return useQuery({
    queryKey: canvasKeys.workspaceList(workspaceId),
    queryFn: async () => unwrap(await listWorkspaceCanvasesAction(workspaceId)),
    initialData,
    enabled: Boolean(workspaceId),
  });
}

export function useRenameCanvas(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ canvasId, title }: { canvasId: string; title: string }) =>
      unwrap(await renameCanvasAction(canvasId, title)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: canvasKeys.workspaceList(workspaceId) });
    },
  });
}

export function useDeleteCanvas(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (canvasId: string) => unwrap(await deleteCanvasAction(canvasId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: canvasKeys.workspaceList(workspaceId) });
    },
  });
}
