import { beforeEach, describe, expect, it, vi } from "vitest";
import { SharesService } from "../../../src/service/shares.service";

function shareRow(over: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return {
    id: "shr_1",
    workspaceId: "wsp_1",
    resourceKind: "page" as const,
    resourceId: "pag_1",
    grantedToUserId: "usr_target",
    grantedToEmail: null,
    permission: "viewer" as const,
    status: "active" as const,
    grantedByUserId: "usr_a",
    createdAt: now,
    updatedAt: now,
    acceptedAt: now,
    revokedAt: null,
    expiresAt: null,
    note: null,
    ...over,
  };
}

function buildSut(opts?: {
  userByEmail?: { id: string } | null;
  findById?: ReturnType<typeof shareRow> | null;
}) {
  const sharesRepo = {
    findById: vi.fn(async () =>
      opts?.findById !== undefined ? opts.findById : shareRow(),
    ),
    listActiveAndPendingFor: vi.fn(async () => [shareRow()]),
    insert: vi.fn(async (v: Record<string, unknown>) => shareRow(v)),
    updateById: vi.fn(async (id: string, patch: Record<string, unknown>) =>
      shareRow({ id, ...patch }),
    ),
  };
  const permissions = {
    require: vi.fn(async () => ({
      workspaceId: "wsp_1",
      permission: "admin",
      source: "membership",
    })),
  };
  const email = { sendInvite: vi.fn(async () => undefined) };
  const changeEvents = { record: vi.fn(async () => undefined) };
  const userByEmail = opts?.userByEmail;
  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => (userByEmail ? [userByEmail] : []),
        }),
      }),
    }),
  };
  const service = new SharesService(
    db as never,
    sharesRepo as never,
    permissions as never,
    email as never,
    changeEvents as never,
  );
  return { service, sharesRepo, email, changeEvents };
}

describe("SharesService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("create immediate-active path when email maps to existing user", async () => {
    const { service, sharesRepo, email } = buildSut({ userByEmail: { id: "usr_target" } });
    await service.create(
      {
        resourceKind: "page",
        resourceId: "pag_1",
        grantedToEmail: "x@y.dev",
        permission: "editor",
      },
      "usr_a",
      "actor@x.dev",
    );
    const v = sharesRepo.insert.mock.calls[0]![0] as Record<string, unknown>;
    expect(v.status).toBe("active");
    expect(v.grantedToUserId).toBe("usr_target");
    expect(email.sendInvite).not.toHaveBeenCalled();
  });

  it("create pending path when email unknown + sends invite", async () => {
    const { service, sharesRepo, email } = buildSut();
    await service.create(
      {
        resourceKind: "page",
        resourceId: "pag_1",
        grantedToEmail: "new@x.dev",
        permission: "viewer",
      },
      "usr_a",
      "actor@x.dev",
    );
    const v = sharesRepo.insert.mock.calls[0]![0] as Record<string, unknown>;
    expect(v.status).toBe("pending");
    expect(v.grantedToEmail).toBe("new@x.dev");
    expect(email.sendInvite).toHaveBeenCalledOnce();
  });

  it("revoke marks status=revoked + audits", async () => {
    const { service, changeEvents } = buildSut({ findById: shareRow() });
    const out = await service.revoke("shr_1", "usr_a");
    expect(out.status).toBe("revoked");
    expect(changeEvents.record).toHaveBeenCalled();
  });

  it("resend rejects non-pending share", async () => {
    const { service } = buildSut({ findById: shareRow({ status: "active" }) });
    await expect(service.resend("shr_1", "usr_a", "actor@x.dev")).rejects.toThrow(/pending/);
  });

  it("accept enforces matching email", async () => {
    const { service } = buildSut({
      findById: shareRow({ status: "pending", grantedToEmail: "owner@x.dev" }),
    });
    await expect(service.accept("shr_1", "usr_b", "other@x.dev")).rejects.toThrow(/different email/);
  });

  it("accept attaches user + flips to active", async () => {
    const { service, sharesRepo } = buildSut({
      findById: shareRow({ status: "pending", grantedToEmail: "owner@x.dev" }),
    });
    await service.accept("shr_1", "usr_owner", "owner@x.dev");
    const patch = sharesRepo.updateById.mock.calls[0]![1] as Record<string, unknown>;
    expect(patch.status).toBe("active");
    expect(patch.grantedToUserId).toBe("usr_owner");
    expect(patch.grantedToEmail).toBeNull();
  });
});
