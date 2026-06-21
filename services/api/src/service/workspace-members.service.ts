/**
 * Membership lifecycle for a workspace:
 *   - list members
 *   - invite by email
 *       · if the email already has a user → attach an active membership
 *       · else → store a pending workspace_invite (claimed at /me sweep)
 *   - role change (with last-OWNER protection)
 *   - remove (with last-OWNER protection)
 *
 * The "invite" path is intentionally part of MembersService rather than a
 * separate InvitesService: from the caller's POV they're adding a member;
 * the pending-vs-active distinction is plumbing.
 */
import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type {
  WorkspaceMemberInvite,
  WorkspaceMemberUpdate,
} from "../api/v1/request/workspace.request";
import { ChangeEventsService } from "../common/change-events.service";
import { EmailService } from "../common/email.service";
import { BadRequest, Forbidden, NotFound } from "../common/error/error-factory";
import { Database, DRIZZLE } from "../db/database.module";
import { WorkspaceInvitesRepository } from "../db/repository/workspace-invites.repository";
import { WorkspaceMembersRepository } from "../db/repository/workspace-members.repository";
import { users } from "../db/schemas/users";
import {
  toWorkspaceMember,
  type WorkspaceMember,
  type WorkspaceRole,
} from "../model/workspace.model";
import { WorkspacesService } from "./workspaces.service";

interface MemberRowForApi {
  member: WorkspaceMember;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
}

@Injectable()
export class WorkspaceMembersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly membersRepo: WorkspaceMembersRepository,
    private readonly invitesRepo: WorkspaceInvitesRepository,
    private readonly workspacesService: WorkspacesService,
    private readonly email: EmailService,
    private readonly changeEvents: ChangeEventsService,
  ) {}

  /** List members. Caller must be a member (any role). */
  async list(workspaceId: string, actorUserId: string): Promise<MemberRowForApi[]> {
    await this.workspacesService.requireRole(actorUserId, workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    const rows = await this.membersRepo.listByWorkspace(workspaceId);
    return rows.map((r) => ({
      member: toWorkspaceMember(r.member),
      user: r.user,
    }));
  }

  /**
   * Invite by email — branches:
   *   - existing user: attach an active membership immediately
   *   - unknown email: record a pending workspace_invite + send invite email
   */
  async invite(
    workspaceId: string,
    input: WorkspaceMemberInvite,
    actorUserId: string,
    actorEmail: string | undefined,
  ): Promise<MemberRowForApi> {
    await this.workspacesService.requireRole(actorUserId, workspaceId, ["OWNER", "ADMIN"]);
    const email = input.email.toLowerCase().trim();

    const [existingUser] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      const already = await this.membersRepo.findOne(workspaceId, existingUser.id);
      if (already) throw BadRequest("Already a member of this workspace.");

      const row = await this.membersRepo.insert({
        workspaceId,
        userId: existingUser.id,
        role: input.role,
      });
      await this.changeEvents.record({
        workspaceId,
        actorType: "USER",
        userId: actorUserId,
        entityType: "workspace_member",
        entityId: row.id,
        action: "member.add",
        after: row,
      });
      return {
        member: toWorkspaceMember(row),
        user: {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          avatarUrl: existingUser.avatarUrl,
        },
      };
    }

    // No user yet — pending invite path.
    const dupe = await this.invitesRepo.findByWorkspaceAndEmail(workspaceId, email);
    if (dupe) throw BadRequest("An invite to that email is already pending.");

    const invite = await this.invitesRepo.insert({
      workspaceId,
      email,
      role: input.role,
      invitedByUserId: actorUserId,
    });

    await this.email
      .sendInvite({
        to: email,
        inviter: actorEmail ?? "Someone",
        resourceKind: "project",
        resourceId: workspaceId,
        shareId: invite.id,
      })
      .catch(() => undefined);

    await this.changeEvents.record({
      workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "workspace_invite",
      entityId: invite.id,
      action: "member.invite.pending",
      after: invite,
    });

    return {
      member: {
        id: invite.id,
        workspaceId: invite.workspaceId,
        userId: `usr_${email}`,
        role: invite.role,
        createdAt: invite.createdAt,
      },
      user: { id: `usr_${email}`, name: email, email, avatarUrl: null },
    };
  }

  async updateRole(
    workspaceId: string,
    targetUserId: string,
    input: WorkspaceMemberUpdate,
    actorUserId: string,
  ): Promise<WorkspaceMember> {
    const actorRole = await this.workspacesService.requireRole(actorUserId, workspaceId, [
      "OWNER",
      "ADMIN",
    ]);
    const existing = await this.membersRepo.findOne(workspaceId, targetUserId);
    if (!existing) throw NotFound("Member not found.");

    if (existing.role === "OWNER" && input.role !== "OWNER") {
      await this.assertNotLastOwner(workspaceId, targetUserId);
    }
    if (actorRole === "ADMIN" && (existing.role === "OWNER" || input.role === "OWNER")) {
      throw Forbidden("Only owners can change owner roles.");
    }

    const updated = await this.membersRepo.updateRole(workspaceId, targetUserId, input.role);
    if (!updated) throw NotFound("Member not found.");

    await this.changeEvents.record({
      workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "workspace_member",
      entityId: updated.id,
      action: "member.role.update",
      before: existing,
      after: updated,
      patch: input,
    });
    return toWorkspaceMember(updated);
  }

  async remove(workspaceId: string, targetUserId: string, actorUserId: string): Promise<void> {
    const actorRole = await this.workspacesService.requireRole(actorUserId, workspaceId, [
      "OWNER",
      "ADMIN",
    ]);
    const existing = await this.membersRepo.findOne(workspaceId, targetUserId);
    if (!existing) throw NotFound("Member not found.");

    if (existing.role === "OWNER") {
      await this.assertNotLastOwner(workspaceId, targetUserId);
      if (actorRole !== "OWNER") {
        throw Forbidden("Only owners can remove other owners.");
      }
    }

    await this.membersRepo.remove(workspaceId, targetUserId);
    await this.changeEvents.record({
      workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "workspace_member",
      entityId: existing.id,
      action: "member.remove",
      before: existing,
    });
  }

  private async assertNotLastOwner(workspaceId: string, userIdLeaving: string) {
    const owners = await this.membersRepo.listOwners(workspaceId);
    const others = owners.filter((o) => o.userId !== userIdLeaving);
    if (others.length === 0) {
      throw BadRequest("Workspace must keep at least one OWNER.");
    }
  }

  /** Helper used by allowed role assertions. */
  getActorRole(userId: string, workspaceId: string, allowed: WorkspaceRole[]) {
    return this.workspacesService.requireRole(userId, workspaceId, allowed);
  }
}
