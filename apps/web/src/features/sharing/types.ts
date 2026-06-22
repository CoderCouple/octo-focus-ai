export type Visibility = "private" | "unlisted" | "workspace" | "public";
export type SharePermission = "viewer" | "commenter" | "editor" | "admin";
export type ResourceKind = "project" | "page" | "canvas";

export interface PublishedResource {
  resourceKind: ResourceKind;
  resourceId: string;
  publicSlug: string;
  visibility: Visibility;
  publishedAt: string | null;
  lastPublishedAt: string | null;
  workspaceSlug: string;
  publicUrl: string;
}

export interface ResourceShare {
  id: string;
  resourceKind: ResourceKind;
  resourceId: string;
  grantedToUserId: string | null;
  grantedToEmail: string | null;
  permission: SharePermission;
  status: "active" | "pending" | "revoked" | "expired";
  createdAt: string;
}

export interface ShareLink {
  id: string;
  resourceKind: ResourceKind;
  resourceId: string;
  token: string;
  permission: SharePermission;
  hasPassword: boolean;
  expiresAt: string | null;
  url: string;
}
