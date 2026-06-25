import type { Page } from "../../../model/page.model";
import type { Visibility } from "../../../model/project.model";

export interface PageDto {
  id: string;
  projectId: string;
  title: string;
  document: unknown;
  contentMd: string;
  publicSlug: string | null;
  visibility: Visibility;
  publishedAt: string | null;
  lastPublishedAt: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface WorkspacePageSummaryDto {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  contentMd: string;
  publicSlug: string | null;
  visibility: Visibility;
  updatedAt: string;
  createdAt: string;
  creator: { id: string; name: string; email: string } | null;
  sharedCount: number;
}

export function pageToDto(page: Page): PageDto {
  return {
    id: page.id,
    projectId: page.projectId,
    title: page.title,
    document: page.document,
    contentMd: page.contentMd,
    publicSlug: page.publicSlug,
    visibility: page.visibility,
    publishedAt: page.publishedAt ? page.publishedAt.toISOString() : null,
    lastPublishedAt: page.lastPublishedAt ? page.lastPublishedAt.toISOString() : null,
    settings: page.settings,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
    deletedAt: page.deletedAt ? page.deletedAt.toISOString() : null,
  };
}
