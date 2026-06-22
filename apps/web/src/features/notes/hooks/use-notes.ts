"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteNoteAction,
  listWorkspaceNotesAction,
  renameNoteAction,
} from "../actions/notes-actions";
import { noteKeys } from "../constants";
import type { WorkspacePageSummary } from "../types";

function unwrap<T>(r: { success: true; data: T } | { success: false; message: string }): T {
  if (!r.success) throw new Error(r.message);
  return r.data;
}

export function useWorkspaceNotes(workspaceId: string, initialData?: WorkspacePageSummary[]) {
  return useQuery({
    queryKey: noteKeys.workspaceList(workspaceId),
    queryFn: async () => unwrap(await listWorkspaceNotesAction(workspaceId)),
    initialData,
    enabled: Boolean(workspaceId),
  });
}

export function useRenameNote(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ pageId, title }: { pageId: string; title: string }) =>
      unwrap(await renameNoteAction(pageId, title)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: noteKeys.workspaceList(workspaceId) });
    },
  });
}

export function useDeleteNote(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pageId: string) => unwrap(await deleteNoteAction(pageId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: noteKeys.workspaceList(workspaceId) });
    },
  });
}
