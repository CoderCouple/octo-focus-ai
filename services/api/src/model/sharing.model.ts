import type { resourceShares, shareLinks } from "../db/schemas/sharing";

export type ResourceKind = "project" | "page" | "canvas" | "meeting" | "component";
export type SharePermission = "viewer" | "commenter" | "editor" | "admin";
export type ShareStatus = "active" | "pending" | "revoked" | "expired";

export interface ResourceShare {
  id: string;
  workspaceId: string;
  resourceKind: ResourceKind;
  resourceId: string;
  grantedToUserId: string | null;
  grantedToEmail: string | null;
  permission: SharePermission;
  status: ShareStatus;
  grantedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date | null;
  note: string | null;
}

export interface ShareLink {
  id: string;
  workspaceId: string;
  resourceKind: ResourceKind;
  resourceId: string;
  token: string;
  permission: SharePermission;
  passwordHash: string | null;
  expiresAt: Date | null;
  maxUses: number | null;
  useCount: number;
  revokedAt: Date | null;
  createdByUserId: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  note: string | null;
}

export function toResourceShare(row: typeof resourceShares.$inferSelect): ResourceShare {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    resourceKind: row.resourceKind,
    resourceId: row.resourceId,
    grantedToUserId: row.grantedToUserId,
    grantedToEmail: row.grantedToEmail,
    permission: row.permission,
    status: row.status,
    grantedByUserId: row.grantedByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    acceptedAt: row.acceptedAt,
    revokedAt: row.revokedAt,
    expiresAt: row.expiresAt,
    note: row.note,
  };
}

export function toShareLink(row: typeof shareLinks.$inferSelect): ShareLink {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    resourceKind: row.resourceKind,
    resourceId: row.resourceId,
    token: row.token,
    permission: row.permission,
    passwordHash: row.passwordHash,
    expiresAt: row.expiresAt,
    maxUses: row.maxUses,
    useCount: row.useCount,
    revokedAt: row.revokedAt,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
    note: row.note,
  };
}
