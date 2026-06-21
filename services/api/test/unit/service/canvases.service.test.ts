import { beforeEach, describe, expect, it, vi } from "vitest";
import { CanvasesService } from "../../../src/service/canvases.service";

function canvasRow() {
  const now = new Date();
  return {
    id: "cnv_1",
    projectId: "prj_1",
    title: "Diagram",
    document: {},
    diagramSchema: null,
    publicSlug: null,
    visibility: "private",
    publishedAt: null,
    lastPublishedAt: null,
    settings: {},
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

function buildSut(opts?: { hasActive?: boolean }) {
  const canvasesRepo = {
    findById: vi.fn(async (id: string) => (id === "cnv_1" ? canvasRow() : null)),
    listByProject: vi.fn(async () => [canvasRow()]),
    listForWorkspace: vi.fn(async () => []),
    hasActiveInProject: vi.fn(async () => opts?.hasActive ?? false),
    insert: vi.fn(async (v: Record<string, unknown>) => ({ ...canvasRow(), ...v })),
    updateById: vi.fn(async (id: string, patch: Record<string, unknown>) => ({
      ...canvasRow(),
      id,
      ...patch,
    })),
    softDeleteById: vi.fn(async (id: string) => ({
      ...canvasRow(),
      id,
      deletedAt: new Date(),
    })),
  };
  const projectsRepo = {
    findById: vi.fn(async () => ({ id: "prj_1", workspaceId: "wsp_1" })),
  };
  const workspacesService = { requireRole: vi.fn(async () => "MEMBER") };
  const changeEvents = { record: vi.fn(async () => undefined) };
  const service = new CanvasesService(
    canvasesRepo as never,
    projectsRepo as never,
    workspacesService as never,
    changeEvents as never,
  );
  return { service, canvasesRepo, changeEvents };
}

describe("CanvasesService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("create rejects when active canvas already exists (1:1)", async () => {
    const { service } = buildSut({ hasActive: true });
    await expect(service.create("prj_1", { title: "x" }, "usr_a")).rejects.toThrow(
      /already has a canvas/,
    );
  });

  it("update accepts diagramSchema patch", async () => {
    const { service, canvasesRepo } = buildSut();
    await service.update(
      "cnv_1",
      { diagramSchema: { dsl: "A > B" } },
      "usr_a",
    );
    const callPatch = canvasesRepo.updateById.mock.calls[0]![1] as Record<string, unknown>;
    expect(callPatch.diagramSchema).toEqual({ dsl: "A > B" });
  });

  it("softDelete sets deletedAt", async () => {
    const { service } = buildSut();
    const out = await service.softDelete("cnv_1", "usr_a");
    expect(out.deletedAt).not.toBeNull();
  });
});
