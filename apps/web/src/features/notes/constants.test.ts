import { describe, expect, it } from "vitest";
import { noteKeys, PUBLISHED_VISIBILITIES } from "./constants";

describe("noteKeys", () => {
  it("workspaceList is a tuple beginning with 'notes' / 'workspace' / id", () => {
    expect(noteKeys.workspaceList("wsp_1")).toEqual(["notes", "workspace", "wsp_1"]);
  });

  it("projectList is a tuple beginning with 'notes' / 'project' / id", () => {
    expect(noteKeys.projectList("prj_1")).toEqual(["notes", "project", "prj_1"]);
  });

  it("detail is a tuple beginning with 'notes' / 'detail' / id", () => {
    expect(noteKeys.detail("pag_1")).toEqual(["notes", "detail", "pag_1"]);
  });

  it("all is the shared prefix for invalidation", () => {
    expect(noteKeys.all).toEqual(["notes"]);
    // Hierarchical — every sub-key starts with `all`.
    const sub = noteKeys.workspaceList("wsp_1");
    expect(sub.slice(0, noteKeys.all.length)).toEqual(noteKeys.all);
  });
});

describe("PUBLISHED_VISIBILITIES", () => {
  it("contains public + unlisted only", () => {
    expect(PUBLISHED_VISIBILITIES.has("public")).toBe(true);
    expect(PUBLISHED_VISIBILITIES.has("unlisted")).toBe(true);
    expect(PUBLISHED_VISIBILITIES.has("private")).toBe(false);
    expect(PUBLISHED_VISIBILITIES.has("workspace")).toBe(false);
  });
});
