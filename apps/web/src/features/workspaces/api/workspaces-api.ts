import "server-only";
import { serverFetch } from "@/lib/api/server-fetch";
import type {
  MeResponse,
  Role,
  Workspace,
  WorkspaceCreate,
  WorkspaceMember,
  WorkspaceUpdate,
} from "../types";

export function getMeApi() {
  return serverFetch<MeResponse>("/me");
}

export function createWorkspaceApi(body: WorkspaceCreate) {
  return serverFetch<Workspace>("/workspaces", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateWorkspaceApi(id: string, body: WorkspaceUpdate) {
  return serverFetch<Workspace>(`/workspaces/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteWorkspaceApi(id: string) {
  return serverFetch<{ ok: true }>(`/workspaces/${id}`, { method: "DELETE" });
}

export function listWorkspaceMembersApi(workspaceId: string) {
  return serverFetch<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`);
}

export function inviteWorkspaceMemberApi(
  workspaceId: string,
  body: { email: string; role: Role },
) {
  return serverFetch<WorkspaceMember>(`/workspaces/${workspaceId}/members`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateMemberRoleApi(workspaceId: string, userId: string, role: Role) {
  return serverFetch<WorkspaceMember>(`/workspaces/${workspaceId}/members/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export function removeMemberApi(workspaceId: string, userId: string) {
  return serverFetch<{ ok: true }>(`/workspaces/${workspaceId}/members/${userId}`, {
    method: "DELETE",
  });
}
