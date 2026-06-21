import type { pageBlocks, pages } from "../db/schemas/pages";
import type { Visibility } from "./project.model";

export interface Page {
  id: string;
  projectId: string;
  title: string;
  document: unknown;
  contentMd: string;
  publicSlug: string | null;
  visibility: Visibility;
  publishedAt: Date | null;
  lastPublishedAt: Date | null;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface PageBlock {
  id: string;
  pageId: string;
  type: string;
  content: unknown;
  position: number;
  parentBlockId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toPage(row: typeof pages.$inferSelect): Page {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    document: row.document,
    contentMd: row.contentMd,
    publicSlug: row.publicSlug,
    visibility: row.visibility,
    publishedAt: row.publishedAt,
    lastPublishedAt: row.lastPublishedAt,
    settings: (row.settings as Record<string, unknown>) ?? {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export function toPageBlock(row: typeof pageBlocks.$inferSelect): PageBlock {
  return {
    id: row.id,
    pageId: row.pageId,
    type: row.type,
    content: row.content,
    position: row.position,
    parentBlockId: row.parentBlockId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
