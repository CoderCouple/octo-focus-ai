import type { projects } from "../db/schemas/projects";

export type Visibility = "private" | "unlisted" | "workspace" | "public";

export interface CreatorSummary {
  id: string;
  name: string;
  email: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  createdByUserId: string;
  name: string;
  description: string | null;
  icon: string | null;
  publicSlug: string | null;
  visibility: Visibility;
  publishedAt: Date | null;
  lastPublishedAt: Date | null;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  /**
   * Set by `ProjectsService.listForWorkspace` so list views can render
   * accurate per-project chips. Single-project fetches (getOne / create
   * / update) leave these undefined — callers can fall back to false.
   */
  hasNote?: boolean;
  hasCanvas?: boolean;
  /**
   * Creator + share-count enrichment. Returned by list endpoints
   * (joined from users + COUNT(resource_shares)). Single-resource
   * fetches leave them undefined.
   */
  creator?: CreatorSummary | null;
  sharedCount?: number;
}

export function toProject(
  row: typeof projects.$inferSelect & {
    hasNote?: boolean;
    hasCanvas?: boolean;
    creator?: CreatorSummary | null;
    sharedCount?: number;
  },
): Project {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    createdByUserId: row.createdByUserId,
    name: row.name,
    description: row.description,
    icon: row.icon,
    publicSlug: row.publicSlug,
    visibility: row.visibility,
    publishedAt: row.publishedAt,
    lastPublishedAt: row.lastPublishedAt,
    settings: (row.settings as Record<string, unknown>) ?? {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    archivedAt: row.archivedAt,
    ...(row.hasNote !== undefined ? { hasNote: row.hasNote } : {}),
    ...(row.hasCanvas !== undefined ? { hasCanvas: row.hasCanvas } : {}),
    ...(row.creator !== undefined ? { creator: row.creator } : {}),
    ...(row.sharedCount !== undefined ? { sharedCount: row.sharedCount } : {}),
  };
}
