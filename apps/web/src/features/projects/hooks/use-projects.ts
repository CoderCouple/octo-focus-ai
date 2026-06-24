"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCanvasProjectAction,
  createNoteProjectAction,
  createProjectAction,
  createProjectWithBothAction,
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

export type ProjectShape = "note" | "canvas" | "both" | "empty";

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

/**
 * Picks the right composed action based on what shape the user said
 * the new project should have. Keeps the dialog code branch-free.
 */
export function useCreateProjectShape(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ shape, body }: { shape: ProjectShape; body: ProjectCreate }) => {
      switch (shape) {
        case "note":
          return unwrap(await createNoteProjectAction(workspaceId, body));
        case "canvas":
          return unwrap(await createCanvasProjectAction(workspaceId, body));
        case "both":
          return unwrap(await createProjectWithBothAction(workspaceId, body));
        case "empty":
          return unwrap(await createProjectAction(workspaceId, body));
      }
    },
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
