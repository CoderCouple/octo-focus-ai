import type { figures } from "../db/schemas/figures";
import type { CreatorSummary, Visibility } from "./project.model";

export interface FigureRow {
  id: string;
  workspaceId: string;
  createdByUserId: string;
  title: string;
  description: string | null;
  dsl: string;
  publicSlug: string | null;
  visibility: Visibility;
  publishedAt: Date | null;
  lastPublishedAt: Date | null;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  creator?: CreatorSummary | null;
  sharedCount?: number;
}

export function toFigure(
  row: typeof figures.$inferSelect & {
    creator?: CreatorSummary | null;
    sharedCount?: number;
  },
): FigureRow {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    createdByUserId: row.createdByUserId,
    title: row.title,
    description: row.description,
    dsl: row.dsl,
    publicSlug: row.publicSlug,
    visibility: row.visibility,
    publishedAt: row.publishedAt,
    lastPublishedAt: row.lastPublishedAt,
    settings: (row.settings as Record<string, unknown>) ?? {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    ...(row.creator !== undefined ? { creator: row.creator } : {}),
    ...(row.sharedCount !== undefined ? { sharedCount: row.sharedCount } : {}),
  };
}
