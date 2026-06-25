import { PUBLISHED_VISIBILITIES } from "../constants";
import type { WorkspaceCanvasSummary } from "../types";

export interface CanvasStats {
  total: number;
  drafts: number;
  published: number;
  editedLast7d: number;
  createdLast7d: number;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function deriveCanvasStats(
  canvases: WorkspaceCanvasSummary[],
  now: number = Date.now(),
): CanvasStats {
  let drafts = 0;
  let published = 0;
  let editedLast7d = 0;
  let createdLast7d = 0;
  for (const c of canvases) {
    if (PUBLISHED_VISIBILITIES.has(c.visibility)) published += 1;
    else drafts += 1;
    if (now - new Date(c.updatedAt).getTime() < SEVEN_DAYS_MS) editedLast7d += 1;
    if (now - new Date(c.createdAt).getTime() < SEVEN_DAYS_MS) createdLast7d += 1;
  }
  return { total: canvases.length, drafts, published, editedLast7d, createdLast7d };
}

export function canvasStatusLabel(
  visibility: WorkspaceCanvasSummary["visibility"],
): "Published" | "Draft" {
  return PUBLISHED_VISIBILITIES.has(visibility) ? "Published" : "Draft";
}
