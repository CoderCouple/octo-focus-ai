import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublishService } from "../../../src/service/publish.service";

function projectRow(over: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return {
    id: "prj_1",
    workspaceId: "wsp_1",
    name: "Acme",
    description: null,
    icon: null,
    publicSlug: null as string | null,
    visibility: "private",
    publishedAt: null as Date | null,
    lastPublishedAt: null as Date | null,
    settings: {},
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    ...over,
  };
}

interface ChildStub {
  id: string;
  title: string;
  publicSlug: string | null;
  visibility: "private" | "unlisted" | "workspace" | "public";
  publishedAt: Date | null;
  lastPublishedAt: Date | null;
}

function childStub(over: Partial<ChildStub> = {}): ChildStub {
  return {
    id: "pag_1",
    title: "Acme | Note",
    publicSlug: null,
    visibility: "private",
    publishedAt: null,
    lastPublishedAt: null,
    ...over,
  };
}

function buildSut(opts?: {
  existing?: ReturnType<typeof projectRow>;
  pages?: ChildStub[];
  canvases?: ChildStub[];
}) {
  const existing = opts?.existing ?? projectRow();
  const projectsRepo = {
    findById: vi.fn(async () => existing),
    updateById: vi.fn(async (id: string, patch: Record<string, unknown>) =>
      projectRow({ id, ...existing, ...patch }),
    ),
  };
  const pages = [...(opts?.pages ?? [])];
  const canvases = [...(opts?.canvases ?? [])];
  const pagesRepo = {
    findById: vi.fn(),
    updateById: vi.fn(async (id: string, patch: Record<string, unknown>) => {
      const child = pages.find((p) => p.id === id);
      if (!child) return null;
      Object.assign(child, patch);
      return child;
    }),
    listByProject: vi.fn(async () => pages),
  };
  const canvasesRepo = {
    findById: vi.fn(),
    updateById: vi.fn(async (id: string, patch: Record<string, unknown>) => {
      const child = canvases.find((c) => c.id === id);
      if (!child) return null;
      Object.assign(child, patch);
      return child;
    }),
    listByProject: vi.fn(async () => canvases),
  };
  const permissions = {
    require: vi.fn(async () => ({
      workspaceId: "wsp_1",
      permission: "admin",
      source: "membership",
    })),
  };
  let slugCounter = 0;
  const slugs = {
    allocate: vi.fn(async () => {
      slugCounter += 1;
      return slugCounter === 1 ? "acme" : `acme-${slugCounter}`;
    }),
  };
  const changeEvents = { record: vi.fn(async () => undefined) };
  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ slug: "dev-workspace" }],
        }),
      }),
    }),
  };

  const service = new PublishService(
    db as never,
    projectsRepo as never,
    pagesRepo as never,
    canvasesRepo as never,
    permissions as never,
    slugs as never,
    changeEvents as never,
  );
  return {
    service,
    projectsRepo,
    pagesRepo,
    canvasesRepo,
    slugs,
    changeEvents,
    pages,
    canvases,
  };
}

describe("PublishService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("first publish allocates a slug + records audit + builds publicUrl", async () => {
    const { service, slugs, changeEvents } = buildSut();
    const out = await service.publish("project", "prj_1", { visibility: "public" }, "usr_a");
    expect(slugs.allocate).toHaveBeenCalled();
    expect(out.publicSlug).toBe("acme");
    expect(out.publicUrl).toBe("/p/dev-workspace/acme");
    expect(out.visibility).toBe("public");
    expect(changeEvents.record).toHaveBeenCalled();
  });

  it("re-publish keeps the sticky slug", async () => {
    const { service, slugs } = buildSut({
      existing: projectRow({ publicSlug: "old-slug", visibility: "private" }),
    });
    const out = await service.publish("project", "prj_1", { visibility: "unlisted" }, "usr_a");
    expect(slugs.allocate).not.toHaveBeenCalled();
    expect(out.publicSlug).toBe("old-slug");
  });

  it("flipping back to private preserves publishedAt timestamps", async () => {
    const past = new Date("2026-01-01");
    const { service } = buildSut({
      existing: projectRow({
        publicSlug: "acme",
        visibility: "public",
        publishedAt: past,
        lastPublishedAt: past,
      }),
    });
    const out = await service.publish("project", "prj_1", { visibility: "private" }, "usr_a");
    expect(out.visibility).toBe("private");
    expect(out.publishedAt).toBe(past.toISOString());
    expect(out.lastPublishedAt).toBe(past.toISOString());
  });

  describe("cascade publish", () => {
    it("publishing a project also publishes its page + canvas children with their own slugs", async () => {
      const { service, pagesRepo, canvasesRepo, slugs, pages, canvases } = buildSut({
        pages: [childStub({ id: "pag_1", title: "Acme | Note" })],
        canvases: [childStub({ id: "cnv_1", title: "Acme | Canvas" })],
      });
      await service.publish("project", "prj_1", { visibility: "public" }, "usr_a");
      // 3 slug allocations: project + page + canvas
      expect(slugs.allocate).toHaveBeenCalledTimes(3);
      expect(pagesRepo.updateById).toHaveBeenCalledWith(
        "pag_1",
        expect.objectContaining({ visibility: "public", publicSlug: expect.any(String) }),
      );
      expect(canvasesRepo.updateById).toHaveBeenCalledWith(
        "cnv_1",
        expect.objectContaining({ visibility: "public", publicSlug: expect.any(String) }),
      );
      expect(pages[0]!.visibility).toBe("public");
      expect(canvases[0]!.visibility).toBe("public");
    });

    it("children re-use their sticky slug when re-published", async () => {
      const { service, slugs } = buildSut({
        pages: [
          childStub({ id: "pag_1", publicSlug: "page-slug", visibility: "private" }),
        ],
        canvases: [
          childStub({ id: "cnv_1", publicSlug: "canvas-slug", visibility: "private" }),
        ],
      });
      await service.publish("project", "prj_1", { visibility: "public" }, "usr_a");
      // Only the project allocates a slug; children re-use their existing ones.
      expect(slugs.allocate).toHaveBeenCalledTimes(1);
    });

    it("flipping the project to private also flips children", async () => {
      const past = new Date("2026-01-01");
      const { service, pages, canvases } = buildSut({
        existing: projectRow({
          publicSlug: "acme",
          visibility: "public",
          publishedAt: past,
          lastPublishedAt: past,
        }),
        pages: [
          childStub({ id: "pag_1", publicSlug: "p", visibility: "public", publishedAt: past, lastPublishedAt: past }),
        ],
        canvases: [
          childStub({ id: "cnv_1", publicSlug: "c", visibility: "public", publishedAt: past, lastPublishedAt: past }),
        ],
      });
      await service.publish("project", "prj_1", { visibility: "private" }, "usr_a");
      expect(pages[0]!.visibility).toBe("private");
      expect(canvases[0]!.visibility).toBe("private");
      // Original publishedAt timestamps stay so external links keep
      // tracking the original publish moment.
      expect(pages[0]!.publishedAt).toEqual(past);
      expect(canvases[0]!.publishedAt).toEqual(past);
    });

    it("publishing a single page (kind != project) does NOT cascade", async () => {
      const { service, pagesRepo, canvasesRepo } = buildSut({
        existing: projectRow(),
        pages: [childStub({ id: "pag_1" })],
        canvases: [childStub({ id: "cnv_1" })],
      });
      // We're publishing the project — but assert the cascade was
      // gated on `kind === "project"` by changing kind to page.
      // Mock loadResource pathway: page lookups still need to work.
      const pageRow = childStub({ id: "pag_1", title: "Solo Page" });
      pagesRepo.findById = vi.fn(async () => pageRow);
      await service.publish("page", "pag_1", { visibility: "public" }, "usr_a");
      // The page's listByProject must not have run as part of a
      // cascade (only the project path triggers cascade).
      expect(pagesRepo.listByProject).not.toHaveBeenCalled();
      expect(canvasesRepo.listByProject).not.toHaveBeenCalled();
    });
  });
});
