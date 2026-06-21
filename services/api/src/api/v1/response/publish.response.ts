import type { Visibility } from "../../../model/project.model";
import type { ResourceKind } from "../../../model/sharing.model";

export interface PublishedResourceDto {
  resourceKind: ResourceKind;
  resourceId: string;
  publicSlug: string;
  visibility: Visibility;
  publishedAt: string | null;
  lastPublishedAt: string | null;
  workspaceSlug: string;
  publicUrl: string;
}
