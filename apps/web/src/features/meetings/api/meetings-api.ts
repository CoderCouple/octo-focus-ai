import "server-only";
import { serverFetch } from "@/lib/api/server-fetch";
import type {
  Meeting,
  MeetingCreate,
  MeetingUpdate,
  WorkspaceMeetingSummary,
} from "../types";

export function listWorkspaceMeetingsApi(workspaceId: string) {
  return serverFetch<WorkspaceMeetingSummary[]>(`/workspaces/${workspaceId}/meetings`);
}

export function getMeetingApi(id: string) {
  return serverFetch<Meeting>(`/meetings/${id}`);
}

export function createMeetingApi(workspaceId: string, body: MeetingCreate) {
  return serverFetch<Meeting>(`/workspaces/${workspaceId}/meetings`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateMeetingApi(id: string, body: MeetingUpdate) {
  return serverFetch<Meeting>(`/meetings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteMeetingApi(id: string) {
  return serverFetch<Meeting>(`/meetings/${id}`, { method: "DELETE" });
}
