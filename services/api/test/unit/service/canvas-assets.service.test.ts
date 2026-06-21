import { beforeEach, describe, expect, it, vi } from "vitest";
import { CanvasAssetsService } from "../../../src/service/canvas-assets.service";

function assetRow(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "ast_1",
    canvasId: "cnv_1",
    createdByUserId: "usr_a",
    publicSlug: "diagram",
    visibility: "public",
    format: "svg",
    width: 800,
    height: 600,
    title: "diagram",
    contentType: "image/svg+xml",
    content: Buffer.from(""),
    createdAt: new Date(),
    revokedAt: null,
    ...over,
  };
}

function buildSut(opts?: { findById?: ReturnType<typeof assetRow> | null }) {
  const assetsRepo = {
    findById: vi.fn(async () => (opts?.findById !== undefined ? opts.findById : assetRow())),
    listByCanvas: vi.fn(async () => [assetRow()]),
    insert: vi.fn(async (v: Record<string, unknown>) => assetRow(v)),
    revokeById: vi.fn(async (id: string) => assetRow({ id, revokedAt: new Date() })),
  };
  const permissions = {
    require: vi.fn(async () => ({ workspaceId: "wsp_1", permission: "admin", source: "membership" })),
  };
  const slugs = { allocate: vi.fn(async (_w: string, t: string) => t.toLowerCase()) };
  const changeEvents = { record: vi.fn(async () => undefined) };
  const service = new CanvasAssetsService(
    assetsRepo as never,
    permissions as never,
    slugs as never,
    changeEvents as never,
  );
  return { service, assetsRepo, permissions, slugs, changeEvents };
}

describe("CanvasAssetsService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("create allocates a slug and inserts the asset", async () => {
    const { service, assetsRepo, slugs } = buildSut();
    const svgBase64 = Buffer.from("<svg/>").toString("base64");
    const out = await service.create(
      "cnv_1",
      {
        format: "svg",
        content: svgBase64,
        contentType: "image/svg+xml",
        title: "Diagram",
        visibility: "public",
      },
      "usr_a",
    );
    expect(slugs.allocate).toHaveBeenCalled();
    expect(assetsRepo.insert).toHaveBeenCalled();
    expect(out.publicSlug).toBeTruthy();
  });

  it("create rejects empty payload", async () => {
    const { service } = buildSut();
    await expect(
      service.create(
        "cnv_1",
        { format: "svg", content: "", contentType: "image/svg+xml", visibility: "public" },
        "usr_a",
      ),
    ).rejects.toThrow();
  });

  it("revoke 404s on missing", async () => {
    const { service } = buildSut({ findById: null });
    await expect(service.revoke("ast_404", "usr_a")).rejects.toThrow(/not found/i);
  });

  it("audit payload omits raw content bytes", async () => {
    const { service, changeEvents } = buildSut();
    const svgBase64 = Buffer.from("<svg/>").toString("base64");
    await service.create(
      "cnv_1",
      {
        format: "svg",
        content: svgBase64,
        contentType: "image/svg+xml",
        title: "D",
        visibility: "public",
      },
      "usr_a",
    );
    const auditCall = changeEvents.record.mock.calls[0]![0] as { after?: { content?: unknown } };
    expect(auditCall.after?.content).toBeUndefined();
  });
});
