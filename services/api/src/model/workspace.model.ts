import type { workspaceInvites, workspaceMembers, workspaces } from "../db/schemas/workspaces";

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER";
export type WorkspaceInviteStatus = "active" | "pending" | "revoked" | "expired";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: Date;
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedByUserId: string;
  status: WorkspaceInviteStatus;
  createdAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
}

export function toWorkspace(row: typeof workspaces.$inferSelect): Workspace {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toWorkspaceMember(row: typeof workspaceMembers.$inferSelect): WorkspaceMember {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    role: row.role,
    createdAt: row.createdAt,
  };
}

export function toWorkspaceInvite(row: typeof workspaceInvites.$inferSelect): WorkspaceInvite {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    email: row.email,
    role: row.role,
    invitedByUserId: row.invitedByUserId,
    status: row.status,
    createdAt: row.createdAt,
    acceptedAt: row.acceptedAt,
    revokedAt: row.revokedAt,
  };
}
