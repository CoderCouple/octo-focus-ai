"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMeetingAction,
  deleteMeetingAction,
  listWorkspaceMeetingsAction,
  updateMeetingAction,
} from "../actions/meetings-actions";
import { meetingKeys } from "../constants";
import type { MeetingCreate, MeetingUpdate, WorkspaceMeetingSummary } from "../types";

function unwrap<T>(r: { success: true; data: T } | { success: false; message: string }): T {
  if (!r.success) throw new Error(r.message);
  return r.data;
}

export function useWorkspaceMeetings(
  workspaceId: string,
  initialData?: WorkspaceMeetingSummary[],
) {
  return useQuery({
    queryKey: meetingKeys.list(workspaceId),
    queryFn: async () => unwrap(await listWorkspaceMeetingsAction(workspaceId)),
    initialData,
    enabled: Boolean(workspaceId),
  });
}

export function useCreateMeeting(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: MeetingCreate) =>
      unwrap(await createMeetingAction(workspaceId, body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: meetingKeys.list(workspaceId) });
    },
  });
}

export function useDeleteMeeting(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrap(await deleteMeetingAction(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: meetingKeys.list(workspaceId) });
    },
  });
}

export function useRenameMeeting(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) =>
      unwrap(await updateMeetingAction(id, { title })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: meetingKeys.list(workspaceId) });
    },
  });
}
