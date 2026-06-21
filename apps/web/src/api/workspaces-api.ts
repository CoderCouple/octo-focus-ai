import "server-only";
import type { Workspace, WorkspaceCreate, WorkspaceMember, WorkspaceUpdate } from "@octofocus/shared";
import { serverApiFetch } from "./server-client";

export function createWorkspaceApi(body: WorkspaceCreate) {
  return serverApiFetch<Workspace>("/workspaces", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateWorkspaceApi(id: string, body: WorkspaceUpdate) {
  return serverApiFetch<Workspace>(`/workspaces/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteWorkspaceApi(id: string) {
  return serverApiFetch<{ ok: true }>(`/workspaces/${id}`, { method: "DELETE" });
}

export function listWorkspaceMembersApi(workspaceId: string) {
  return serverApiFetch<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`);
}

export function inviteWorkspaceMemberApi(
  workspaceId: string,
  body: { email: string; role: "OWNER" | "ADMIN" | "MEMBER" },
) {
  return serverApiFetch<WorkspaceMember>(`/workspaces/${workspaceId}/members`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateMemberRoleApi(
  workspaceId: string,
  userId: string,
  role: "OWNER" | "ADMIN" | "MEMBER",
) {
  return serverApiFetch<WorkspaceMember>(`/workspaces/${workspaceId}/members/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export function removeMemberApi(workspaceId: string, userId: string) {
  return serverApiFetch<{ ok: true }>(`/workspaces/${workspaceId}/members/${userId}`, {
    method: "DELETE",
  });
}
