import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectsService } from "../../../src/service/projects.service";

function row(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return {
    id: "prj_1",
    workspaceId: "wsp_1",
    name: "Proj",
    description: null,
    icon: null,
    publicSlug: null,
    visibility: "private",
    publishedAt: null,
    lastPublishedAt: null,
    settings: {},
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    ...overrides,
  };
}

interface ChildStub {
  id: string;
  title: string;
}

function buildSut(opts?: {
  existing?: Record<string, ReturnType<typeof row> | null>;
  pages?: ChildStub[];
  canvases?: ChildStub[];
}) {
  const projectsRepo = {
    findById: vi.fn(async (id: string) => opts?.existing?.[id] ?? null),
    listByWorkspace: vi.fn(async () => [row()]),
    insert: vi.fn(async (v: Record<string, unknown>) => row(v)),
    updateById: vi.fn(async (id: string, patch: Record<string, unknown>) => ({
      ...(opts?.existing?.[id] ?? row({ id })),
      ...patch,
    })),
    archiveById: vi.fn(async (id: string) => ({
      ...(opts?.existing?.[id] ?? row({ id })),
      archivedAt: new Date(),
    })),
  };
  const pages: ChildStub[] = [...(opts?.pages ?? [])];
  const canvases: ChildStub[] = [...(opts?.canvases ?? [])];
  const pagesRepo = {
    listByProject: vi.fn(async () => pages),
    updateById: vi.fn(async (id: string, patch: Record<string, unknown>) => {
      const child = pages.find((p) => p.id === id);
      if (child && typeof patch.title === "string") child.title = patch.title;
      return child ?? null;
    }),
    softDeleteById: vi.fn(async (id: string) => {
      const child = pages.find((p) => p.id === id);
      return child ?? null;
    }),
  };
  const canvasesRepo = {
    listByProject: vi.fn(async () => canvases),
    updateById: vi.fn(async (id: string, patch: Record<string, unknown>) => {
      const child = canvases.find((c) => c.id === id);
      if (child && typeof patch.title === "string") child.title = patch.title;
      return child ?? null;
    }),
    softDeleteById: vi.fn(async (id: string) => {
      const child = canvases.find((c) => c.id === id);
      return child ?? null;
    }),
  };
  const workspacesService = { requireRole: vi.fn(async () => "MEMBER") };
  const changeEvents = { record: vi.fn(async () => undefined) };
  const service = new ProjectsService(
    projectsRepo as never,
    pagesRepo as never,
    canvasesRepo as never,
    workspacesService as never,
    changeEvents as never,
  );
  return {
    service,
    projectsRepo,
    pagesRepo,
    canvasesRepo,
    workspacesService,
    changeEvents,
    pages,
    canvases,
  };
}

describe("ProjectsService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("listForWorkspace gates on membership", async () => {
    const { service, workspacesService } = buildSut();
    await service.listForWorkspace("wsp_1", "usr_a");
    expect(workspacesService.requireRole).toHaveBeenCalledWith("usr_a", "wsp_1", [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
  });

  it("getOne 404s when missing", async () => {
    const { service } = buildSut({ existing: { prj_404: null } });
    await expect(service.getOne("prj_404", "usr_a")).rejects.toThrow(/not found/i);
  });

  it("create records audit", async () => {
    const { service, changeEvents } = buildSut();
    await service.create("wsp_1", { name: "X" }, "usr_a");
    expect(changeEvents.record).toHaveBeenCalled();
  });

  it("archive sets archivedAt", async () => {
    const { service, projectsRepo } = buildSut({ existing: { prj_1: row() } });
    const out = await service.archive("prj_1", "usr_a");
    expect(out.archivedAt).not.toBeNull();
    expect(projectsRepo.archiveById).toHaveBeenCalledWith("prj_1");
  });

  it("update only touches provided fields", async () => {
    const { service, projectsRepo } = buildSut({ existing: { prj_1: row() } });
    await service.update("prj_1", { name: "New" }, "usr_a");
    expect(projectsRepo.updateById).toHaveBeenCalled();
    const callPatch = projectsRepo.updateById.mock.calls[0]![1] as Record<string, unknown>;
    expect(callPatch.name).toBe("New");
    expect("description" in callPatch).toBe(false);
  });

  describe("cascade rename", () => {
    it("re-derives child titles still matching the OLD pattern", async () => {
      const { service, pagesRepo, canvasesRepo, pages, canvases } = buildSut({
        existing: { prj_1: row({ name: "Old" }) },
        pages: [{ id: "pag_1", title: "Old | Note" }],
        canvases: [{ id: "cnv_1", title: "Old | Canvas" }],
      });
      await service.update("prj_1", { name: "New" }, "usr_a");
      expect(pagesRepo.updateById).toHaveBeenCalledWith(
        "pag_1",
        expect.objectContaining({ title: "New | Note" }),
      );
      expect(canvasesRepo.updateById).toHaveBeenCalledWith(
        "cnv_1",
        expect.objectContaining({ title: "New | Canvas" }),
      );
      expect(pages[0]!.title).toBe("New | Note");
      expect(canvases[0]!.title).toBe("New | Canvas");
    });

    it("leaves children with hand-edited titles alone (sticky opt-out)", async () => {
      const { service, pagesRepo, canvasesRepo } = buildSut({
        existing: { prj_1: row({ name: "Old" }) },
        pages: [{ id: "pag_1", title: "Q1 Brief" }],
        canvases: [{ id: "cnv_1", title: "Architecture v3" }],
      });
      await service.update("prj_1", { name: "New" }, "usr_a");
      expect(pagesRepo.updateById).not.toHaveBeenCalled();
      expect(canvasesRepo.updateById).not.toHaveBeenCalled();
    });

    it("does not cascade when the name patch is undefined or unchanged", async () => {
      const { service, pagesRepo, canvasesRepo } = buildSut({
        existing: { prj_1: row({ name: "Same" }) },
        pages: [{ id: "pag_1", title: "Same | Note" }],
      });
      await service.update("prj_1", { description: "new desc" }, "usr_a");
      expect(pagesRepo.listByProject).not.toHaveBeenCalled();
      expect(pagesRepo.updateById).not.toHaveBeenCalled();
      expect(canvasesRepo.updateById).not.toHaveBeenCalled();
    });
  });

  describe("cascade delete", () => {
    it("soft-deletes every active page + canvas under the project", async () => {
      const { service, pagesRepo, canvasesRepo } = buildSut({
        existing: { prj_1: row() },
        pages: [
          { id: "pag_1", title: "Proj | Note" },
          { id: "pag_2", title: "Hand-edited" },
        ],
        canvases: [{ id: "cnv_1", title: "Proj | Canvas" }],
      });
      await service.archive("prj_1", "usr_a");
      expect(pagesRepo.softDeleteById).toHaveBeenCalledWith("pag_1");
      expect(pagesRepo.softDeleteById).toHaveBeenCalledWith("pag_2");
      expect(canvasesRepo.softDeleteById).toHaveBeenCalledWith("cnv_1");
    });

    it("emits a change_event per cascaded child", async () => {
      const { service, changeEvents } = buildSut({
        existing: { prj_1: row() },
        pages: [{ id: "pag_1", title: "Proj | Note" }],
        canvases: [{ id: "cnv_1", title: "Proj | Canvas" }],
      });
      await service.archive("prj_1", "usr_a");
      // 1 project archive + 1 page delete + 1 canvas delete
      expect(changeEvents.record).toHaveBeenCalledTimes(3);
    });
  });
});
