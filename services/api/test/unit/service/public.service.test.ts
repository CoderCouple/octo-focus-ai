import { createHash } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicService } from "../../../src/service/public.service";

function buildSut(opts?: {
  resolveByToken?: { link: Record<string, unknown>; permission: string; workspaceId: string } | null;
  loadPublicHit?: { kind: "project" | "page" | "canvas"; workspaceSlug: string; row: { id: string } } | null;
  asset?: { content: Buffer; contentType: string; visibility: string; revokedAt: Date | null } | null;
}) {
  const permissions = {
    resolveByToken: vi.fn(async () => opts?.resolveByToken ?? null),
    loadPublicByWorkspaceAndSlug: vi.fn(async () => opts?.loadPublicHit ?? null),
  };
  const projectsRepo = { findById: vi.fn(async () => ({ id: "prj_1" })) };
  const pagesRepo = { findById: vi.fn(async () => ({ id: "pag_1" })) };
  const canvasesRepo = { findById: vi.fn(async () => ({ id: "cnv_1" })) };
  const assetsRepo = {
    findByPublicSlug: vi.fn(async () => opts?.asset ?? null),
  };
  const linksRepo = { recordUse: vi.fn(async () => undefined) };

  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({ limit: async () => [] }),
        }),
      }),
    }),
  };

  const service = new PublicService(
    db as never,
    permissions as never,
    projectsRepo as never,
    pagesRepo as never,
    canvasesRepo as never,
    assetsRepo as never,
    linksRepo as never,
  );
  return { service, permissions, linksRepo };
}

describe("PublicService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getBySlug 404s when permissions miss", async () => {
    const { service } = buildSut({ loadPublicHit: null });
    await expect(service.getBySlug("ws", "slug")).rejects.toThrow(/not found/i);
  });

  it("getBySlug returns project payload with page+canvas", async () => {
    const { service } = buildSut({
      loadPublicHit: { kind: "project", workspaceSlug: "ws", row: { id: "prj_1" } },
    });
    const out = await service.getBySlug("ws", "acme");
    expect(out.kind).toBe("project");
    expect("page" in out).toBe(true);
    expect("canvas" in out).toBe(true);
  });

  it("getByShareToken rejects without password when link has one", async () => {
    const { service } = buildSut({
      resolveByToken: {
        link: { id: "lnk_1", resourceKind: "canvas", resourceId: "cnv_1", passwordHash: "x" },
        permission: "viewer",
        workspaceId: "wsp_1",
      },
    });
    await expect(service.getByShareToken("tok", undefined)).rejects.toThrow(/Password required/);
  });

  it("getByShareToken accepts matching password + bumps use count", async () => {
    const password = "hunter2";
    const passwordHash = createHash("sha256").update(password).digest("hex");
    const { service, linksRepo } = buildSut({
      resolveByToken: {
        link: { id: "lnk_1", resourceKind: "canvas", resourceId: "cnv_1", passwordHash },
        permission: "viewer",
        workspaceId: "wsp_1",
      },
    });
    const out = await service.getByShareToken("tok", password);
    expect(out.permission).toBe("viewer");
    expect(linksRepo.recordUse).toHaveBeenCalledWith("lnk_1");
  });

  it("getImageBySlug 404s on missing/revoked/private", async () => {
    const a = buildSut({ asset: null });
    await expect(a.service.getImageBySlug("none")).rejects.toThrow(/not found/i);

    const b = buildSut({
      asset: { content: Buffer.from(""), contentType: "image/svg+xml", visibility: "public", revokedAt: new Date() },
    });
    await expect(b.service.getImageBySlug("revoked")).rejects.toThrow(/not found/i);

    const c = buildSut({
      asset: { content: Buffer.from(""), contentType: "image/svg+xml", visibility: "private", revokedAt: null },
    });
    await expect(c.service.getImageBySlug("private")).rejects.toThrow(/not public/i);
  });

  it("getImageBySlug returns the asset row on success", async () => {
    const { service } = buildSut({
      asset: {
        content: Buffer.from("<svg/>"),
        contentType: "image/svg+xml",
        visibility: "public",
        revokedAt: null,
      },
    });
    const out = await service.getImageBySlug("ok");
    expect(out.contentType).toBe("image/svg+xml");
  });
});
