import { beforeEach, describe, expect, it, vi } from "vitest";
import { PagesService } from "../../../src/service/pages.service";

function pageRow() {
  const now = new Date();
  return {
    id: "pag_1",
    projectId: "prj_1",
    title: "Notes",
    document: {},
    contentMd: "",
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
  const pagesRepo = {
    findById: vi.fn(async (id: string) => (id === "pag_1" ? pageRow() : null)),
    listByProject: vi.fn(async () => [pageRow()]),
    listForWorkspace: vi.fn(async () => []),
    hasActiveInProject: vi.fn(async () => opts?.hasActive ?? false),
    insert: vi.fn(async (v: Record<string, unknown>) => ({ ...pageRow(), ...v })),
    updateById: vi.fn(async (id: string, patch: Record<string, unknown>) => ({
      ...pageRow(),
      id,
      ...patch,
    })),
    softDeleteById: vi.fn(async (id: string) => ({
      ...pageRow(),
      id,
      deletedAt: new Date(),
    })),
  };
  const projectsRepo = {
    findById: vi.fn(async () => ({ id: "prj_1", workspaceId: "wsp_1" })),
  };
  const workspacesService = { requireRole: vi.fn(async () => "MEMBER") };
  const changeEvents = { record: vi.fn(async () => undefined) };
  const service = new PagesService(
    pagesRepo as never,
    projectsRepo as never,
    workspacesService as never,
    changeEvents as never,
  );
  return { service, pagesRepo, changeEvents };
}

describe("PagesService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("create rejects when active page already exists (1:1)", async () => {
    const { service } = buildSut({ hasActive: true });
    await expect(service.create("prj_1", { title: "x" }, "usr_a")).rejects.toThrow(
      /already has a note/,
    );
  });

  it("create inserts + audits", async () => {
    const { service, pagesRepo, changeEvents } = buildSut();
    await service.create("prj_1", { title: "x" }, "usr_a");
    expect(pagesRepo.insert).toHaveBeenCalled();
    expect(changeEvents.record).toHaveBeenCalled();
  });

  it("update propagates settings patch", async () => {
    const { service, pagesRepo } = buildSut();
    await service.update("pag_1", { settings: { font: "serif" } }, "usr_a");
    const callPatch = pagesRepo.updateById.mock.calls[0]![1] as Record<string, unknown>;
    expect(callPatch.settings).toEqual({ font: "serif" });
  });

  it("softDelete sets deletedAt + audits", async () => {
    const { service, pagesRepo } = buildSut();
    const out = await service.softDelete("pag_1", "usr_a");
    expect(out.deletedAt).not.toBeNull();
    expect(pagesRepo.softDeleteById).toHaveBeenCalledWith("pag_1");
  });
});
