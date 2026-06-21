import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceMembersService } from "../../../src/service/workspace-members.service";

function member(role: "OWNER" | "ADMIN" | "MEMBER" = "MEMBER") {
  return {
    id: "mem_1",
    workspaceId: "wsp_1",
    userId: "usr_target",
    role,
    createdAt: new Date(),
  };
}

function buildSut(options?: {
  existingUserByEmail?: { id: string; name: string; email: string; avatarUrl: string | null } | null;
  existingMember?: ReturnType<typeof member> | null;
  pendingInvite?: { id: string } | null;
  owners?: Array<{ userId: string }>;
}) {
  const membersRepo = {
    findOne: vi.fn(async () => options?.existingMember ?? null),
    insert: vi.fn(async (v: Record<string, unknown>) => ({
      id: "mem_new",
      ...v,
      createdAt: new Date(),
    })),
    listOwners: vi.fn(async () => options?.owners ?? [{ userId: "usr_owner" }]),
    updateRole: vi.fn(async () => ({ ...member("ADMIN") })),
    remove: vi.fn(async () => undefined),
  };
  const invitesRepo = {
    findByWorkspaceAndEmail: vi.fn(async () => options?.pendingInvite ?? null),
    insert: vi.fn(async (v: Record<string, unknown>) => ({
      id: "win_1",
      ...v,
      createdAt: new Date(),
    })),
  };
  const workspacesService = {
    requireRole: vi.fn(async (_u: string, _w: string, allowed: string[]) => allowed[0]),
  };
  const email = { sendInvite: vi.fn(async () => undefined) };
  const changeEvents = { record: vi.fn(async () => undefined) };

  const userByEmail = options?.existingUserByEmail ?? null;
  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => (userByEmail ? [userByEmail] : []),
        }),
      }),
    }),
  };

  const service = new WorkspaceMembersService(
    db as never,
    membersRepo as never,
    invitesRepo as never,
    workspacesService as never,
    email as never,
    changeEvents as never,
  );
  return { service, membersRepo, invitesRepo, workspacesService, email, changeEvents };
}

describe("WorkspaceMembersService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("invite", () => {
    it("attaches a membership when the email already has a user", async () => {
      const { service, membersRepo, email } = buildSut({
        existingUserByEmail: {
          id: "usr_existing",
          name: "Existing",
          email: "e@x.dev",
          avatarUrl: null,
        },
      });
      const result = await service.invite(
        "wsp_1",
        { email: "E@x.dev", role: "MEMBER" },
        "usr_a",
        "actor@x.dev",
      );
      expect(membersRepo.insert).toHaveBeenCalled();
      expect(email.sendInvite).not.toHaveBeenCalled();
      expect(result.user.email).toBe("e@x.dev");
    });

    it("rejects when the user already has a membership", async () => {
      const { service } = buildSut({
        existingUserByEmail: {
          id: "usr_existing",
          name: "Existing",
          email: "e@x.dev",
          avatarUrl: null,
        },
        existingMember: member("MEMBER"),
      });
      await expect(
        service.invite("wsp_1", { email: "e@x.dev", role: "MEMBER" }, "usr_a", "actor@x.dev"),
      ).rejects.toThrow(/Already a member/);
    });

    it("creates a pending invite + sends email for an unknown address", async () => {
      const { service, invitesRepo, email } = buildSut();
      const result = await service.invite(
        "wsp_1",
        { email: "new@x.dev", role: "ADMIN" },
        "usr_a",
        "actor@x.dev",
      );
      expect(invitesRepo.insert).toHaveBeenCalled();
      expect(email.sendInvite).toHaveBeenCalledOnce();
      expect(result.user.email).toBe("new@x.dev");
    });

    it("rejects when a pending invite already exists", async () => {
      const { service } = buildSut({ pendingInvite: { id: "win_old" } });
      await expect(
        service.invite("wsp_1", { email: "new@x.dev", role: "MEMBER" }, "usr_a", "actor@x.dev"),
      ).rejects.toThrow(/already pending/);
    });
  });

  describe("updateRole", () => {
    it("rejects when the only OWNER would be demoted", async () => {
      const { service } = buildSut({
        existingMember: member("OWNER"),
        owners: [{ userId: "usr_target" }],
      });
      await expect(
        service.updateRole("wsp_1", "usr_target", { role: "MEMBER" }, "usr_a"),
      ).rejects.toThrow(/at least one OWNER/);
    });

    it("rejects when an ADMIN tries to set OWNER", async () => {
      const { service, workspacesService } = buildSut({
        existingMember: member("MEMBER"),
      });
      workspacesService.requireRole.mockResolvedValue("ADMIN");
      await expect(
        service.updateRole("wsp_1", "usr_target", { role: "OWNER" }, "usr_a"),
      ).rejects.toThrow(/Only owners/);
    });

    it("updates and records audit", async () => {
      const { service, changeEvents } = buildSut({ existingMember: member("MEMBER") });
      await service.updateRole("wsp_1", "usr_target", { role: "ADMIN" }, "usr_a");
      expect(changeEvents.record).toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("rejects when the only OWNER would be removed", async () => {
      const { service } = buildSut({
        existingMember: member("OWNER"),
        owners: [{ userId: "usr_target" }],
      });
      await expect(service.remove("wsp_1", "usr_target", "usr_a")).rejects.toThrow(
        /at least one OWNER/,
      );
    });

    it("rejects when an ADMIN tries to remove an OWNER", async () => {
      const { service, workspacesService } = buildSut({
        existingMember: member("OWNER"),
        owners: [{ userId: "usr_target" }, { userId: "usr_other_owner" }],
      });
      workspacesService.requireRole.mockResolvedValue("ADMIN");
      await expect(service.remove("wsp_1", "usr_target", "usr_a")).rejects.toThrow(
        /Only owners/,
      );
    });

    it("removes successfully", async () => {
      const { service, membersRepo } = buildSut({ existingMember: member("MEMBER") });
      await service.remove("wsp_1", "usr_target", "usr_a");
      expect(membersRepo.remove).toHaveBeenCalledWith("wsp_1", "usr_target");
    });
  });
});
