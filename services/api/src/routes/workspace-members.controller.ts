/**
 * Workspace member management.
 *
 *   GET    /workspaces/:id/members                list members
 *   POST   /workspaces/:id/members                invite by email
 *   PATCH  /workspaces/:id/members/:userId        change role
 *   DELETE /workspaces/:id/members/:userId        remove member
 *
 * Invites: if the email matches an existing user, they're added directly.
 * If not, we still record the membership row attached to a synthetic user
 * stub? No — for now, the invite returns 400 "user not found" until they
 * sign up. The transactional invite email points them at /login; on
 * /me sync, we don't yet auto-attach by email (TODO).
 *
 * Role gating:
 *   - OWNER can do anything
 *   - ADMIN can invite/remove MEMBERs and change roles below ADMIN
 *   - MEMBER read-only
 *   - The last OWNER can't be demoted or removed.
 */
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  WorkspaceMemberInviteSchema,
  WorkspaceMemberUpdateSchema,
  type WorkspaceMember,
  type WorkspaceMemberInvite,
  type WorkspaceMemberUpdate,
} from "@octofocus/shared";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { AuthenticatedRequest } from "../auth/supabase-auth.guard";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { ChangeEventsService } from "../common/change-events.service";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { Database, DRIZZLE } from "../db/database.module";
import { users, workspaceMembers } from "../db/schema";

const IdParam = new ZodValidationPipe(z.string().min(1).max(64));

type Role = "OWNER" | "ADMIN" | "MEMBER";

@Controller("workspaces/:workspaceId/members")
@UseGuards(SupabaseAuthGuard)
export class WorkspaceMembersController {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly changeEvents: ChangeEventsService,
  ) {}

  @Get()
  async list(
    @Param("workspaceId", IdParam) workspaceId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<WorkspaceMember[]> {
    await this.assertMember(req.user.id, workspaceId);
    const rows = await this.db
      .select({
        member: workspaceMembers,
        user: { id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl },
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, workspaceId))
      .orderBy(workspaceMembers.createdAt);
    return rows.map((r) => ({
      id: r.member.id,
      workspaceId: r.member.workspaceId,
      userId: r.member.userId,
      role: r.member.role,
      createdAt: r.member.createdAt.toISOString(),
      user: r.user,
    }));
  }

  @Post()
  async invite(
    @Param("workspaceId", IdParam) workspaceId: string,
    @Body(new ZodValidationPipe(WorkspaceMemberInviteSchema)) body: WorkspaceMemberInvite,
    @Req() req: AuthenticatedRequest,
  ): Promise<WorkspaceMember> {
    await this.assertRole(req.user.id, workspaceId, ["OWNER", "ADMIN"]);

    const [target] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, body.email.toLowerCase()))
      .limit(1);
    if (!target) {
      throw new BadRequestException(
        "No user with that email has signed up yet. Ask them to sign up first.",
      );
    }

    const [already] = await this.db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, target.id),
        ),
      )
      .limit(1);
    if (already) throw new BadRequestException("Already a member of this workspace.");

    const [row] = await this.db
      .insert(workspaceMembers)
      .values({ workspaceId, userId: target.id, role: body.role })
      .returning();
    if (!row) throw new BadRequestException("Failed to add member.");

    await this.changeEvents.record({
      workspaceId,
      actorType: "USER",
      userId: req.user.id,
      entityType: "workspace_member",
      entityId: row.id,
      action: "member.add",
      after: row,
    });

    return {
      id: row.id,
      workspaceId: row.workspaceId,
      userId: row.userId,
      role: row.role,
      createdAt: row.createdAt.toISOString(),
      user: {
        id: target.id,
        name: target.name,
        email: target.email,
        avatarUrl: target.avatarUrl,
      },
    };
  }

  @Patch(":userId")
  async updateRole(
    @Param("workspaceId", IdParam) workspaceId: string,
    @Param("userId", IdParam) userId: string,
    @Body(new ZodValidationPipe(WorkspaceMemberUpdateSchema)) body: WorkspaceMemberUpdate,
    @Req() req: AuthenticatedRequest,
  ): Promise<WorkspaceMember> {
    const actorRole = await this.requireRole(req.user.id, workspaceId, ["OWNER", "ADMIN"]);
    const [existing] = await this.db
      .select()
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)),
      )
      .limit(1);
    if (!existing) throw new NotFoundException("Member not found.");

    if (existing.role === "OWNER" && body.role !== "OWNER") {
      await this.assertNotLastOwner(workspaceId, userId);
    }
    if (actorRole === "ADMIN" && (existing.role === "OWNER" || body.role === "OWNER")) {
      throw new ForbiddenException("Only owners can change owner roles.");
    }

    const [row] = await this.db
      .update(workspaceMembers)
      .set({ role: body.role })
      .where(
        and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)),
      )
      .returning();
    if (!row) throw new NotFoundException("Member not found.");

    await this.changeEvents.record({
      workspaceId,
      actorType: "USER",
      userId: req.user.id,
      entityType: "workspace_member",
      entityId: row.id,
      action: "member.role.update",
      before: existing,
      after: row,
      patch: body,
    });

    return {
      id: row.id,
      workspaceId: row.workspaceId,
      userId: row.userId,
      role: row.role,
      createdAt: row.createdAt.toISOString(),
    };
  }

  @Delete(":userId")
  async remove(
    @Param("workspaceId", IdParam) workspaceId: string,
    @Param("userId", IdParam) userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorRole = await this.requireRole(req.user.id, workspaceId, ["OWNER", "ADMIN"]);
    const [existing] = await this.db
      .select()
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)),
      )
      .limit(1);
    if (!existing) throw new NotFoundException("Member not found.");

    if (existing.role === "OWNER") {
      await this.assertNotLastOwner(workspaceId, userId);
      if (actorRole !== "OWNER") {
        throw new ForbiddenException("Only owners can remove other owners.");
      }
    }

    await this.db
      .delete(workspaceMembers)
      .where(
        and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)),
      );

    await this.changeEvents.record({
      workspaceId,
      actorType: "USER",
      userId: req.user.id,
      entityType: "workspace_member",
      entityId: existing.id,
      action: "member.remove",
      before: existing,
    });
    return { ok: true };
  }

  private async assertMember(userId: string, workspaceId: string) {
    const [member] = await this.db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)),
      )
      .limit(1);
    if (!member) throw new ForbiddenException("Not a member of this workspace.");
  }

  private async assertRole(userId: string, workspaceId: string, allowed: Role[]) {
    await this.requireRole(userId, workspaceId, allowed);
  }

  private async requireRole(userId: string, workspaceId: string, allowed: Role[]): Promise<Role> {
    const [member] = await this.db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)),
      )
      .limit(1);
    if (!member) throw new ForbiddenException("Not a member of this workspace.");
    if (!allowed.includes(member.role)) {
      throw new ForbiddenException(`Requires ${allowed.join(" or ")}.`);
    }
    return member.role;
  }

  private async assertNotLastOwner(workspaceId: string, userIdLeaving: string) {
    const owners = await this.db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.role, "OWNER"),
        ),
      );
    const otherOwners = owners.filter((o) => o.userId !== userIdLeaving);
    if (otherOwners.length === 0) {
      throw new BadRequestException("Workspace must keep at least one OWNER.");
    }
  }
}
