import { beforeEach, describe, expect, it, vi } from "vitest";
import { CliTokensService, hashToken } from "../../../src/service/cli-tokens.service";

function row(over: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return {
    id: "cli_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    userId: "usr_a",
    name: "macbook",
    tokenHash: "deadbeef",
    tokenPreview: "abcd",
    lastUsedAt: null,
    expiresAt: null,
    createdAt: now,
    revokedAt: null,
    ...over,
  };
}

function buildSut() {
  const repo = {
    listForUser: vi.fn(async () => [row()]),
    insert: vi.fn(async (input: Record<string, unknown>) =>
      row({ ...input, id: "cli_bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" }),
    ),
    findById: vi.fn(async () => row()),
    revoke: vi.fn(async () => row({ revokedAt: new Date() })),
  };
  const service = new CliTokensService(repo as never);
  return { service, repo };
}

describe("CliTokensService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("list returns mapped domain objects", async () => {
    const { service } = buildSut();
    const out = await service.list("usr_a");
    expect(out).toHaveLength(1);
    expect(out[0]!.tokenPreview).toBe("abcd");
  });

  it("create mints an oft_ plaintext and stores its hash", async () => {
    const { service, repo } = buildSut();
    const { token, plaintext } = await service.create("usr_a", { name: "macbook" });
    expect(plaintext.startsWith("oft_")).toBe(true);
    expect(token.name).toBe("macbook");
    const inserted = repo.insert.mock.calls[0]![0] as Record<string, unknown>;
    expect(inserted["tokenHash"]).toBe(hashToken(plaintext));
    expect(inserted["tokenPreview"]).toBe(plaintext.slice(-4));
    expect(inserted["userId"]).toBe("usr_a");
  });

  it("create sets expiresAt when expiresInDays is given", async () => {
    const { service, repo } = buildSut();
    await service.create("usr_a", { name: "ci", expiresInDays: 30 });
    const inserted = repo.insert.mock.calls[0]![0] as Record<string, unknown>;
    const expiresAt = inserted["expiresAt"] as Date;
    expect(expiresAt).toBeInstanceOf(Date);
    const days = (expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);
  });

  it("create leaves expiresAt null when no expiry given", async () => {
    const { service, repo } = buildSut();
    await service.create("usr_a", { name: "forever" });
    const inserted = repo.insert.mock.calls[0]![0] as Record<string, unknown>;
    expect(inserted["expiresAt"]).toBeNull();
  });

  it("revoke succeeds for the owner", async () => {
    const { service, repo } = buildSut();
    const out = await service.revoke("cli_x", "usr_a");
    expect(out.revokedAt).not.toBeNull();
    expect(repo.revoke).toHaveBeenCalledWith("cli_x");
  });

  it("revoke refuses someone else's token", async () => {
    const { service } = buildSut();
    await expect(service.revoke("cli_x", "usr_other")).rejects.toThrow(/Not your CLI token/);
  });

  it("revoke 404s when token missing", async () => {
    const { service, repo } = buildSut();
    repo.findById.mockResolvedValueOnce(null);
    await expect(service.revoke("cli_x", "usr_a")).rejects.toThrow(/not found/i);
  });

  it("revoke is a no-op on an already-revoked token", async () => {
    const { service, repo } = buildSut();
    repo.findById.mockResolvedValueOnce(row({ revokedAt: new Date() }));
    const out = await service.revoke("cli_x", "usr_a");
    expect(out.revokedAt).not.toBeNull();
    expect(repo.revoke).not.toHaveBeenCalled();
  });
});
