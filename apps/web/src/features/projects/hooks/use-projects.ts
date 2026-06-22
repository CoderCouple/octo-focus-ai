"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProjectAction,
  deleteProjectAction,
  listProjectsAction,
  renameProjectAction,
} from "../actions/projects-actions";
import { projectKeys } from "../constants";
import type { Project, ProjectCreate } from "../types";

function unwrap<T>(r: { success: true; data: T } | { success: false; message: string }): T {
  if (!r.success) throw new Error(r.message);
  return r.data;
}

export function useProjects(workspaceId: string, initialData?: Project[]) {
  return useQuery({
    queryKey: projectKeys.list(workspaceId),
    queryFn: async () => unwrap(await listProjectsAction(workspaceId)),
    initialData,
    enabled: Boolean(workspaceId),
  });
}

export function useCreateProject(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: ProjectCreate) =>
      unwrap(await createProjectAction(workspaceId, body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.list(workspaceId) });
    },
  });
}

export function useRenameProject(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, name }: { projectId: string; name: string }) =>
      unwrap(await renameProjectAction(projectId, name)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.list(workspaceId) });
    },
  });
}

export function useDeleteProject(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => unwrap(await deleteProjectAction(projectId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.list(workspaceId) });
    },
  });
}
