import type { FigureRow } from "../../../model/figure.model";
import type { Visibility } from "../../../model/project.model";

export interface FigureResourceDto {
  id: string;
  workspaceId: string;
  createdByUserId: string;
  title: string;
  description: string | null;
  dsl: string;
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

/** Trimmed shape returned by the workspace figures list. */
export interface WorkspaceFigureSummaryDto {
  id: string;
  title: string;
  description: string | null;
  visibility: Visibility;
  publicSlug: string | null;
  createdAt: string;
  updatedAt: string;
  creator: { id: string; name: string; email: string } | null;
  sharedCount: number;
}

/** Public (unauthenticated) embed payload — DSL + minimal metadata. */
export interface PublicFigureDto {
  id: string;
  title: string;
  dsl: string;
  visibility: Visibility;
}

export function figureToDto(f: FigureRow): FigureResourceDto {
  return {
    id: f.id,
    workspaceId: f.workspaceId,
    createdByUserId: f.createdByUserId,
    title: f.title,
    description: f.description,
    dsl: f.dsl,
    publicSlug: f.publicSlug,
    visibility: f.visibility,
    publishedAt: f.publishedAt ? f.publishedAt.toISOString() : null,
    lastPublishedAt: f.lastPublishedAt ? f.lastPublishedAt.toISOString() : null,
    settings: f.settings,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
    deletedAt: f.deletedAt ? f.deletedAt.toISOString() : null,
    ...(f.creator !== undefined ? { creator: f.creator } : {}),
    ...(f.sharedCount !== undefined ? { sharedCount: f.sharedCount } : {}),
  };
}

export function figureToPublicDto(f: FigureRow): PublicFigureDto {
  return {
    id: f.id,
    title: f.title,
    dsl: f.dsl,
    visibility: f.visibility,
  };
}
