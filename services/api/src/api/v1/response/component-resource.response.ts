import type { ComponentLanguage, ComponentRow } from "../../../model/component.model";
import type { Visibility } from "../../../model/project.model";

export interface ComponentResourceDto {
  id: string;
  workspaceId: string;
  createdByUserId: string;
  title: string;
  description: string | null;
  code: string;
  language: ComponentLanguage;
  publicSlug: string | null;
  visibility: Visibility;
  publishedAt: string | null;
  lastPublishedAt: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  creator?: { id: string; name: string; email: string } | null;
  sharedCount?: number;
}

/** Trimmed shape returned by the workspace components list. */
export interface WorkspaceComponentSummaryDto {
  id: string;
  title: string;
  description: string | null;
  language: ComponentLanguage;
  visibility: Visibility;
  publicSlug: string | null;
  createdAt: string;
  updatedAt: string;
  creator: { id: string; name: string; email: string } | null;
  sharedCount: number;
}

/** Public (unauthenticated) embed payload — code + minimal metadata. */
export interface PublicComponentDto {
  id: string;
  title: string;
  code: string;
  language: ComponentLanguage;
  visibility: Visibility;
}

export function componentToDto(c: ComponentRow): ComponentResourceDto {
  return {
    id: c.id,
    workspaceId: c.workspaceId,
    createdByUserId: c.createdByUserId,
    title: c.title,
    description: c.description,
    code: c.code,
    language: c.language,
    publicSlug: c.publicSlug,
    visibility: c.visibility,
    publishedAt: c.publishedAt ? c.publishedAt.toISOString() : null,
    lastPublishedAt: c.lastPublishedAt ? c.lastPublishedAt.toISOString() : null,
    settings: c.settings,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    deletedAt: c.deletedAt ? c.deletedAt.toISOString() : null,
    ...(c.creator !== undefined ? { creator: c.creator } : {}),
    ...(c.sharedCount !== undefined ? { sharedCount: c.sharedCount } : {}),
  };
}

export function componentToPublicDto(c: ComponentRow): PublicComponentDto {
  return {
    id: c.id,
    title: c.title,
    code: c.code,
    language: c.language,
    visibility: c.visibility,
  };
}
