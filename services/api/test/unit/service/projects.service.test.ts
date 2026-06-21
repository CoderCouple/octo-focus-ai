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

function buildSut(opts?: { existing?: Record<string, ReturnType<typeof row> | null> }) {
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
  const workspacesService = { requireRole: vi.fn(async () => "MEMBER") };
  const changeEvents = { record: vi.fn(async () => undefined) };
  const service = new ProjectsService(
    projectsRepo as never,
    workspacesService as never,
    changeEvents as never,
  );
  return { service, projectsRepo, workspacesService, changeEvents };
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
});
