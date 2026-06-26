import type { CreatorSummary, Visibility } from "@octofocus/shared";

export type { CreatorSummary, Visibility };

export interface SavedFigure {
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
  creator?: CreatorSummary | null;
  sharedCount?: number;
}

export interface WorkspaceFigureSummary {
  id: string;
  title: string;
  description: string | null;
  visibility: Visibility;
  publicSlug: string | null;
  createdAt: string;
  updatedAt: string;
  creator: CreatorSummary | null;
  sharedCount: number;
}

/** Public payload returned by `GET /v1/public/figures/:id`. */
export interface PublicFigure {
  id: string;
  title: string;
  dsl: string;
  visibility: Visibility;
}

export interface SavedFigureCreate {
  title?: string;
  description?: string | null;
  dsl: string;
}

export interface SavedFigureUpdate {
  title?: string;
  description?: string | null;
  dsl?: string;
}
