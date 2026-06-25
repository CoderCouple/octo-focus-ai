import { PUBLISHED_VISIBILITIES } from "../constants";
import type { WorkspacePageSummary } from "../types";

export interface NotesStats {
  total: number;
  drafts: number;
  published: number;
  updatedLast7d: number;
  createdLast7d: number;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Pure derivation. No fake trend numbers, no charting — just the
 * counts the stats cards render. `now` is injected so tests don't depend
 * on wall-clock time.
 */
export function deriveNotesStats(
  pages: WorkspacePageSummary[],
  now: number = Date.now(),
): NotesStats {
  let drafts = 0;
  let published = 0;
  let updatedLast7d = 0;
  let createdLast7d = 0;

  for (const page of pages) {
    if (PUBLISHED_VISIBILITIES.has(page.visibility)) {
      published += 1;
    } else {
      drafts += 1;
    }
    if (now - new Date(page.updatedAt).getTime() < SEVEN_DAYS_MS) {
      updatedLast7d += 1;
    }
    if (now - new Date(page.createdAt).getTime() < SEVEN_DAYS_MS) {
      createdLast7d += 1;
    }
  }

  return { total: pages.length, drafts, published, updatedLast7d, createdLast7d };
}

/**
 * Display string for the published/draft column. Centralised so the table
 * and any filter UI stay in sync.
 */
export function noteStatusLabel(visibility: WorkspacePageSummary["visibility"]): "Published" | "Draft" {
  return PUBLISHED_VISIBILITIES.has(visibility) ? "Published" : "Draft";
}
