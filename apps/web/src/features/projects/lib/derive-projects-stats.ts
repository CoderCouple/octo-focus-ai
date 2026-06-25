import type { Project } from "../types";

export interface ProjectsStats {
  total: number;
  drafts: number;
  published: number;
  updatedLast7d: number;
  createdLast7d: number;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const PUBLISHED_VISIBILITIES = new Set(["public", "unlisted"]);

/**
 * Pure derivation matching the notes/canvas stats pattern. Drafts =
 * private + workspace-only; Published = anyone with link or public.
 * `now` is injected so tests don't depend on wall-clock time.
 */
export function deriveProjectsStats(
  projects: Project[],
  now: number = Date.now(),
): ProjectsStats {
  let drafts = 0;
  let published = 0;
  let updatedLast7d = 0;
  let createdLast7d = 0;
  for (const p of projects) {
    if (PUBLISHED_VISIBILITIES.has(p.visibility)) published += 1;
    else drafts += 1;
    if (now - new Date(p.updatedAt).getTime() < SEVEN_DAYS_MS) updatedLast7d += 1;
    if (now - new Date(p.createdAt).getTime() < SEVEN_DAYS_MS) createdLast7d += 1;
  }
  return { total: projects.length, drafts, published, updatedLast7d, createdLast7d };
}

export function projectStatusLabel(visibility: Project["visibility"]): "Published" | "Draft" {
  return PUBLISHED_VISIBILITIES.has(visibility) ? "Published" : "Draft";
}
