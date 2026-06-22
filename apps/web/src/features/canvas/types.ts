import type { Canvas, CanvasCreate, CanvasUpdate, Visibility } from "@octofocus/shared";

export type { Canvas, CanvasCreate, CanvasUpdate, Visibility };

/**
 * Row shape returned by `GET /workspaces/:id/canvases` — joined with the
 * project name so the workspace-level list doesn't need an extra roundtrip.
 */
export interface WorkspaceCanvasSummary {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  publicSlug: string | null;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
}

export type CanvasAssetFormat = "svg" | "png";

export interface CanvasAsset {
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

export interface CanvasAssetCreateInput {
  format: CanvasAssetFormat;
  /** base64-encoded payload (no `data:` prefix required) */
  content: string;
  contentType: string;
  width?: number;
  height?: number;
  title?: string;
  visibility?: Visibility;
}
