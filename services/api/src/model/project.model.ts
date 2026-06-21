import type { projects } from "../db/schemas/projects";

export type Visibility = "private" | "unlisted" | "workspace" | "public";

export interface Project {
  id: string;
  workspaceId: string;
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
}

export function toProject(row: typeof projects.$inferSelect): Project {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
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
  };
}
