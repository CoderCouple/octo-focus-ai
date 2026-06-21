import type {
  ResourceKind,
  ResourceShare,
  SharePermission,
  ShareLink,
  ShareStatus,
} from "../../../model/sharing.model";

export interface ResourceShareDto {
  id: string;
  workspaceId: string;
  resourceKind: ResourceKind;
  resourceId: string;
  grantedToUserId: string | null;
  grantedToEmail: string | null;
  permission: SharePermission;
  status: ShareStatus;
  grantedByUserId: string;
  createdAt: string;
  updatedAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
  note: string | null;
}

export interface ShareLinkDto {
  id: string;
  workspaceId: string;
  resourceKind: ResourceKind;
  resourceId: string;
  token: string;
  permission: SharePermission;
  hasPassword: boolean;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
  revokedAt: string | null;
  createdByUserId: string;
  createdAt: string;
  lastUsedAt: string | null;
  note: string | null;
  url: string;
}

export function resourceShareToDto(share: ResourceShare): ResourceShareDto {
  return {
    id: share.id,
    workspaceId: share.workspaceId,
    resourceKind: share.resourceKind,
    resourceId: share.resourceId,
    grantedToUserId: share.grantedToUserId,
    grantedToEmail: share.grantedToEmail,
    permission: share.permission,
    status: share.status,
    grantedByUserId: share.grantedByUserId,
    createdAt: share.createdAt.toISOString(),
    updatedAt: share.updatedAt.toISOString(),
    acceptedAt: share.acceptedAt ? share.acceptedAt.toISOString() : null,
    revokedAt: share.revokedAt ? share.revokedAt.toISOString() : null,
    expiresAt: share.expiresAt ? share.expiresAt.toISOString() : null,
    note: share.note,
  };
}

export function shareLinkToDto(link: ShareLink): ShareLinkDto {
  const base = process.env.PUBLIC_APP_URL ?? "";
  return {
    id: link.id,
    workspaceId: link.workspaceId,
    resourceKind: link.resourceKind,
    resourceId: link.resourceId,
    token: link.token,
    permission: link.permission,
    hasPassword: link.passwordHash != null,
    expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
    maxUses: link.maxUses,
    useCount: link.useCount,
    revokedAt: link.revokedAt ? link.revokedAt.toISOString() : null,
    createdByUserId: link.createdByUserId,
    createdAt: link.createdAt.toISOString(),
    lastUsedAt: link.lastUsedAt ? link.lastUsedAt.toISOString() : null,
    note: link.note,
    url: `${base}/share/${link.token}`,
  };
}
