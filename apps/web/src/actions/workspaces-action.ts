"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  createWorkspaceApi,
  deleteWorkspaceApi,
  inviteWorkspaceMemberApi,
  removeMemberApi,
  updateMemberRoleApi,
  updateWorkspaceApi,
} from "@/api/workspaces-api";

const ACTIVE_WORKSPACE_COOKIE = "of_active_workspace";

export async function getActiveWorkspaceIdCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACTIVE_WORKSPACE_COOKIE)?.value ?? null;
}

export async function setActiveWorkspaceAction(workspaceId: string) {
  const store = await cookies();
  store.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}

export async function createWorkspaceAction(input: { name: string; slug?: string }) {
  const workspace = await createWorkspaceApi(input);
  await setActiveWorkspaceAction(workspace.id);
  return workspace;
}

export async function renameWorkspaceAction(id: string, name: string) {
  return updateWorkspaceApi(id, { name });
}

export async function deleteWorkspaceAction(id: string) {
  await deleteWorkspaceApi(id);
  const store = await cookies();
  store.delete(ACTIVE_WORKSPACE_COOKIE);
  revalidatePath("/", "layout");
}

export async function inviteMemberAction(
  workspaceId: string,
  email: string,
  role: "OWNER" | "ADMIN" | "MEMBER",
) {
  return inviteWorkspaceMemberApi(workspaceId, { email, role });
}

export async function updateMemberRoleAction(
  workspaceId: string,
  userId: string,
  role: "OWNER" | "ADMIN" | "MEMBER",
) {
  return updateMemberRoleApi(workspaceId, userId, role);
}

export async function removeMemberAction(workspaceId: string, userId: string) {
  return removeMemberApi(workspaceId, userId);
}
