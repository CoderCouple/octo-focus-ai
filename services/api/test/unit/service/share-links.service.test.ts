import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShareLinksService } from "../../../src/service/share-links.service";

function linkRow(over: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return {
    id: "lnk_1",
    workspaceId: "wsp_1",
    resourceKind: "canvas" as const,
    resourceId: "cnv_1",
    token: "tok_abc",
    permission: "viewer" as const,
    passwordHash: null,
    expiresAt: null,
    maxUses: null,
    useCount: 0,
    revokedAt: null,
    createdByUserId: "usr_a",
    createdAt: now,
    lastUsedAt: null,
    note: null,
    ...over,
  };
}

function buildSut() {
  const linksRepo = {
    findById: vi.fn(async () => linkRow()),
    listActiveFor: vi.fn(async () => [linkRow()]),
    insert: vi.fn(async (v: Record<string, unknown>) => linkRow(v)),
    updateById: vi.fn(async (id: string, patch: Record<string, unknown>) =>
      linkRow({ id, ...patch }),
    ),
  };
  const permissions = {
    require: vi.fn(async () => ({
      workspaceId: "wsp_1",
      permission: "admin",
      source: "membership",
    })),
  };
  const changeEvents = { record: vi.fn(async () => undefined) };
  const service = new ShareLinksService(
    linksRepo as never,
    permissions as never,
    changeEvents as never,
  );
  return { service, linksRepo, changeEvents };
}

describe("ShareLinksService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("create generates a token + hashes password when provided", async () => {
    const { service, linksRepo } = buildSut();
    await service.create(
      {
        resourceKind: "canvas",
        resourceId: "cnv_1",
        permission: "viewer",
        password: "hunter2",
      },
      "usr_a",
    );
    const v = linksRepo.insert.mock.calls[0]![0] as Record<string, unknown>;
    expect(v.token).toBeTruthy();
    expect(typeof v.passwordHash).toBe("string");
    expect((v.passwordHash as string).length).toBe(64); // sha256 hex
  });

  it("create stores null hash when no password", async () => {
    const { service, linksRepo } = buildSut();
    await service.create(
      { resourceKind: "canvas", resourceId: "cnv_1", permission: "viewer" },
      "usr_a",
    );
    const v = linksRepo.insert.mock.calls[0]![0] as Record<string, unknown>;
    expect(v.passwordHash).toBeNull();
  });

  it("revoke sets revokedAt + audits", async () => {
    const { service, changeEvents, linksRepo } = buildSut();
    await service.revoke("lnk_1", "usr_a");
    const patch = linksRepo.updateById.mock.calls[0]![1] as Record<string, unknown>;
    expect(patch.revokedAt).toBeInstanceOf(Date);
    expect(changeEvents.record).toHaveBeenCalled();
  });
});
