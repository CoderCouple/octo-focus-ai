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

function buildSut(opts?: { existing?: ReturnType<typeof projectRow> }) {
  const existing = opts?.existing ?? projectRow();
  const projectsRepo = {
    findById: vi.fn(async () => existing),
    updateById: vi.fn(async (id: string, patch: Record<string, unknown>) =>
      projectRow({ id, ...existing, ...patch }),
    ),
  };
  const pagesRepo = { findById: vi.fn(), updateById: vi.fn() };
  const canvasesRepo = { findById: vi.fn(), updateById: vi.fn() };
  const permissions = {
    require: vi.fn(async () => ({
      workspaceId: "wsp_1",
      permission: "admin",
      source: "membership",
    })),
  };
  const slugs = { allocate: vi.fn(async () => "acme") };
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
  return { service, projectsRepo, slugs, changeEvents };
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
});
