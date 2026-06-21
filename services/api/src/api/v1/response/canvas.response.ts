import type { Canvas, CanvasAsset, CanvasAssetFormat } from "../../../model/canvas.model";
import type { Visibility } from "../../../model/project.model";

export interface CanvasDto {
  id: string;
  projectId: string;
  title: string;
  document: unknown;
  diagramSchema: unknown;
  publicSlug: string | null;
  visibility: Visibility;
  publishedAt: string | null;
  lastPublishedAt: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface WorkspaceCanvasSummaryDto {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  publicSlug: string | null;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasAssetDto {
  id: string;
  canvasId: string;
  publicSlug: string;
  visibility: Visibility;
  format: CanvasAssetFormat;
  contentType: string;
  width: number | null;
  height: number | null;
  title: string | null;
  createdAt: string;
  revokedAt: string | null;
  url: string;
  markdown: string;
}

export function canvasToDto(canvas: Canvas): CanvasDto {
  return {
    id: canvas.id,
    projectId: canvas.projectId,
    title: canvas.title,
    document: canvas.document,
    diagramSchema: canvas.diagramSchema,
    publicSlug: canvas.publicSlug,
    visibility: canvas.visibility,
    publishedAt: canvas.publishedAt ? canvas.publishedAt.toISOString() : null,
    lastPublishedAt: canvas.lastPublishedAt ? canvas.lastPublishedAt.toISOString() : null,
    settings: canvas.settings,
    createdAt: canvas.createdAt.toISOString(),
    updatedAt: canvas.updatedAt.toISOString(),
    deletedAt: canvas.deletedAt ? canvas.deletedAt.toISOString() : null,
  };
}

export function canvasAssetToDto(asset: CanvasAsset): CanvasAssetDto {
  const base = process.env.PUBLIC_APP_URL ?? "";
  const url = `${base}/i/${asset.publicSlug ?? ""}`;
  const altText = asset.title ?? "canvas export";
  return {
    id: asset.id,
    canvasId: asset.canvasId,
    publicSlug: asset.publicSlug ?? "",
    visibility: asset.visibility,
    format: asset.format,
    contentType: asset.contentType,
    width: asset.width,
    height: asset.height,
    title: asset.title,
    createdAt: asset.createdAt.toISOString(),
    revokedAt: asset.revokedAt ? asset.revokedAt.toISOString() : null,
    url,
    markdown: `![${altText}](${url})`,
  };
}
