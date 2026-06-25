import type { components } from "../db/schemas/components";
import type { CreatorSummary, Visibility } from "./project.model";

export type ComponentLanguage = "html" | "tsx";

export interface ComponentRow {
  id: string;
  workspaceId: string;
  createdByUserId: string;
  title: string;
  description: string | null;
  code: string;
  language: ComponentLanguage;
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

export function toComponent(
  row: typeof components.$inferSelect & {
    creator?: CreatorSummary | null;
    sharedCount?: number;
  },
): ComponentRow {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    createdByUserId: row.createdByUserId,
    title: row.title,
    description: row.description,
    code: row.code,
    language: row.language,
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
