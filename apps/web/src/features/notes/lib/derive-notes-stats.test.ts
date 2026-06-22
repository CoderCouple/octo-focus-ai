import { describe, expect, it } from "vitest";
import { deriveNotesStats, noteStatusLabel } from "./derive-notes-stats";
import type { WorkspacePageSummary } from "../types";

const FIXED_NOW = new Date("2026-06-21T12:00:00Z").getTime();
const ONE_DAY = 24 * 60 * 60 * 1000;

function mkNote(over: Partial<WorkspacePageSummary> = {}): WorkspacePageSummary {
  return {
    id: "pag_1",
    title: "untitled",
    projectId: "prj_1",
    projectName: "Project",
    contentMd: "",
    publicSlug: null,
    visibility: "private",
    createdAt: new Date(FIXED_NOW - 30 * ONE_DAY).toISOString(),
    updatedAt: new Date(FIXED_NOW - ONE_DAY).toISOString(),
    ...over,
  };
}

describe("noteStatusLabel", () => {
  it("returns Published for public visibility", () => {
    expect(noteStatusLabel("public")).toBe("Published");
  });

  it("returns Published for unlisted visibility", () => {
    expect(noteStatusLabel("unlisted")).toBe("Published");
  });

  it("returns Draft for private visibility", () => {
    expect(noteStatusLabel("private")).toBe("Draft");
  });

  it("returns Draft for workspace visibility", () => {
    expect(noteStatusLabel("workspace")).toBe("Draft");
  });
});

describe("deriveNotesStats", () => {
  it("returns all-zero counts for an empty list", () => {
    expect(deriveNotesStats([], FIXED_NOW)).toEqual({
      total: 0,
      drafts: 0,
      published: 0,
      updatedLast7d: 0,
    });
  });

  it("counts published vs draft by visibility", () => {
    const notes = [
      mkNote({ id: "pag_1", visibility: "public" }),
      mkNote({ id: "pag_2", visibility: "unlisted" }),
      mkNote({ id: "pag_3", visibility: "private" }),
      mkNote({ id: "pag_4", visibility: "workspace" }),
    ];
    const stats = deriveNotesStats(notes, FIXED_NOW);
    expect(stats.total).toBe(4);
    expect(stats.published).toBe(2);
    expect(stats.drafts).toBe(2);
  });

  it("counts updatedLast7d using the injected now and a strict <7d threshold", () => {
    const notes = [
      mkNote({ id: "a", updatedAt: new Date(FIXED_NOW - 1 * ONE_DAY).toISOString() }),
      mkNote({ id: "b", updatedAt: new Date(FIXED_NOW - 3 * ONE_DAY).toISOString() }),
      mkNote({ id: "c", updatedAt: new Date(FIXED_NOW - 6 * ONE_DAY).toISOString() }),
      // Exactly 7d ago — boundary excluded.
      mkNote({ id: "d", updatedAt: new Date(FIXED_NOW - 7 * ONE_DAY).toISOString() }),
      mkNote({ id: "e", updatedAt: new Date(FIXED_NOW - 30 * ONE_DAY).toISOString() }),
    ];
    expect(deriveNotesStats(notes, FIXED_NOW).updatedLast7d).toBe(3);
  });

  it("uses Date.now by default when no `now` is provided", () => {
    // Just make sure the call works without injecting now. Verify by
    // confirming the result shape and total, not the exact recency split.
    const notes = [mkNote({ visibility: "public" }), mkNote({ visibility: "private" })];
    const stats = deriveNotesStats(notes);
    expect(stats.total).toBe(2);
    expect(stats.published).toBe(1);
    expect(stats.drafts).toBe(1);
  });
});
