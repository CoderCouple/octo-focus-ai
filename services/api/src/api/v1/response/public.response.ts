import type { ResourceKind, SharePermission } from "../../../model/sharing.model";

export interface PublicResourcePayload {
  kind: ResourceKind;
  workspaceSlug: string;
  data: unknown;
  page?: unknown | null;
  canvas?: unknown | null;
}

export interface PublicShareTokenPayload {
  kind: ResourceKind;
  permission: SharePermission;
  data: unknown;
}
