import { describe, expect, it } from "vitest";
import { canvasStatusLabel, deriveCanvasStats } from "./derive-canvas-stats";
import type { WorkspaceCanvasSummary } from "../types";

const FIXED_NOW = new Date("2026-06-21T12:00:00Z").getTime();
const ONE_DAY = 24 * 60 * 60 * 1000;

function mk(over: Partial<WorkspaceCanvasSummary> = {}): WorkspaceCanvasSummary {
  return {
    id: "cnv_1",
    title: "untitled",
    projectId: "prj_1",
    projectName: "Project",
    publicSlug: null,
    visibility: "private",
    createdAt: new Date(FIXED_NOW - 30 * ONE_DAY).toISOString(),
    updatedAt: new Date(FIXED_NOW - ONE_DAY).toISOString(),
    creator: null,
    sharedCount: 0,
    ...over,
  };
}

describe("canvasStatusLabel", () => {
  it("maps public + unlisted to Published", () => {
    expect(canvasStatusLabel("public")).toBe("Published");
    expect(canvasStatusLabel("unlisted")).toBe("Published");
  });
  it("maps private + workspace to Draft", () => {
    expect(canvasStatusLabel("private")).toBe("Draft");
    expect(canvasStatusLabel("workspace")).toBe("Draft");
  });
});

describe("deriveCanvasStats", () => {
  it("returns zeros for an empty list", () => {
    expect(deriveCanvasStats([], FIXED_NOW)).toEqual({
      total: 0,
      drafts: 0,
      published: 0,
      editedLast7d: 0,
      createdLast7d: 0,
    });
  });

  it("splits drafts vs published by visibility", () => {
    const stats = deriveCanvasStats(
      [
        mk({ id: "1", visibility: "public" }),
        mk({ id: "2", visibility: "unlisted" }),
        mk({ id: "3", visibility: "private" }),
        mk({ id: "4", visibility: "workspace" }),
      ],
      FIXED_NOW,
    );
    expect(stats.total).toBe(4);
    expect(stats.published).toBe(2);
    expect(stats.drafts).toBe(2);
  });

  it("excludes the exactly-7-days-old boundary from editedLast7d", () => {
    const stats = deriveCanvasStats(
      [
        mk({ id: "a", updatedAt: new Date(FIXED_NOW - 1 * ONE_DAY).toISOString() }),
        mk({ id: "b", updatedAt: new Date(FIXED_NOW - 6 * ONE_DAY).toISOString() }),
        mk({ id: "c", updatedAt: new Date(FIXED_NOW - 7 * ONE_DAY).toISOString() }),
        mk({ id: "d", updatedAt: new Date(FIXED_NOW - 30 * ONE_DAY).toISOString() }),
      ],
      FIXED_NOW,
    );
    expect(stats.editedLast7d).toBe(2);
  });
});
