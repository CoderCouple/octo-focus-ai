import type {
  canvasAssets,
  canvasSnapshots,
  canvases,
  pageCanvasLinks,
} from "../db/schemas/canvases";
import type { Visibility } from "./project.model";

export type CanvasAssetFormat = "svg" | "png";

export interface Canvas {
  id: string;
  projectId: string;
  title: string;
  document: unknown;
  diagramSchema: unknown;
  publicSlug: string | null;
  visibility: Visibility;
  publishedAt: Date | null;
  lastPublishedAt: Date | null;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CanvasSnapshot {
  id: string;
  canvasId: string;
  document: unknown;
  diagramSchema: unknown;
  reason: string;
  createdAt: Date;
}

export interface CanvasAsset {
  id: string;
  canvasId: string;
  createdByUserId: string;
  publicSlug: string | null;
  visibility: Visibility;
  format: CanvasAssetFormat;
  width: number | null;
  height: number | null;
  contentType: string;
  title: string | null;
  createdAt: Date;
  revokedAt: Date | null;
}

export interface PageCanvasLink {
  id: string;
  pageId: string;
  canvasId: string;
  relationType: string;
  createdAt: Date;
}

export function toCanvas(row: typeof canvases.$inferSelect): Canvas {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    document: row.document,
    diagramSchema: row.diagramSchema,
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

export function toCanvasSnapshot(row: typeof canvasSnapshots.$inferSelect): CanvasSnapshot {
  return {
    id: row.id,
    canvasId: row.canvasId,
    document: row.document,
    diagramSchema: row.diagramSchema,
    reason: row.reason,
    createdAt: row.createdAt,
  };
}

export function toCanvasAsset(row: typeof canvasAssets.$inferSelect): CanvasAsset {
  return {
    id: row.id,
    canvasId: row.canvasId,
    createdByUserId: row.createdByUserId,
    publicSlug: row.publicSlug,
    visibility: row.visibility,
    format: row.format as CanvasAssetFormat,
    width: row.width,
    height: row.height,
    contentType: row.contentType,
    title: row.title,
    createdAt: row.createdAt,
    revokedAt: row.revokedAt,
  };
}

export function toPageCanvasLink(row: typeof pageCanvasLinks.$inferSelect): PageCanvasLink {
  return {
    id: row.id,
    pageId: row.pageId,
    canvasId: row.canvasId,
    relationType: row.relationType,
    createdAt: row.createdAt,
  };
}
