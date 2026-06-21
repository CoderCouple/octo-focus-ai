/**
 * Workspaces CRUD. Workspace creation is open to any authenticated user
 * (they become the OWNER). Rename + delete require OWNER role on the target
 * workspace.
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
  WorkspaceCreateSchema,
  WorkspaceUpdateSchema,
  type Workspace,
  type WorkspaceCreate,
  type WorkspaceUpdate,
} from "@octofocus/shared";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { AuthenticatedRequest } from "../auth/supabase-auth.guard";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { ChangeEventsService } from "../common/change-events.service";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { Database, DRIZZLE } from "../db/database.module";
import { workspaceMembers, workspaces } from "../db/schema";

const IdParam = new ZodValidationPipe(z.string().min(1).max(64));

function baseSlug(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30) || "workspace"
  );
}

@Controller("workspaces")
@UseGuards(SupabaseAuthGuard)
export class WorkspacesController {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly changeEvents: ChangeEventsService,
  ) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(WorkspaceCreateSchema)) body: WorkspaceCreate,
    @Req() req: AuthenticatedRequest,
  ): Promise<Workspace> {
    const seed = baseSlug(body.slug ?? body.name);
    const slug = await this.uniqueSlug(seed);

    return this.db.transaction(async (tx) => {
      const [workspace] = await tx
        .insert(workspaces)
        .values({ name: body.name.trim(), slug })
        .returning();
      if (!workspace) throw new BadRequestException("Failed to create workspace.");
      await tx
        .insert(workspaceMembers)
        .values({ workspaceId: workspace.id, userId: req.user.id, role: "OWNER" });
      await this.changeEvents.record({
        workspaceId: workspace.id,
        actorType: "USER",
        userId: req.user.id,
        entityType: "workspace",
        entityId: workspace.id,
        action: "workspace.create",
        after: workspace,
      });
      return {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
      };
    });
  }

  @Patch(":id")
  async update(
    @Param("id", IdParam) id: string,
    @Body(new ZodValidationPipe(WorkspaceUpdateSchema)) body: WorkspaceUpdate,
    @Req() req: AuthenticatedRequest,
  ): Promise<Workspace> {
    await this.assertRole(req.user.id, id, ["OWNER", "ADMIN"]);
    const existing = await this.loadWorkspace(id);

    if (body.slug && body.slug !== existing.slug) {
      const taken = await this.db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.slug, body.slug))
        .limit(1);
      if (taken.length > 0) throw new BadRequestException("Slug already in use.");
    }

    const [row] = await this.db
      .update(workspaces)
      .set({
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.slug !== undefined ? { slug: body.slug } : {}),
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, id))
      .returning();
    if (!row) throw new NotFoundException("Workspace not found.");

    await this.changeEvents.record({
      workspaceId: id,
      actorType: "USER",
      userId: req.user.id,
      entityType: "workspace",
      entityId: id,
      action: "workspace.update",
      before: existing,
      after: row,
      patch: body,
    });
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  @Delete(":id")
  async remove(@Param("id", IdParam) id: string, @Req() req: AuthenticatedRequest) {
    await this.assertRole(req.user.id, id, ["OWNER"]);
    const existing = await this.loadWorkspace(id);
    await this.db.delete(workspaces).where(eq(workspaces.id, id));
    await this.changeEvents.record({
      workspaceId: id,
      actorType: "USER",
      userId: req.user.id,
      entityType: "workspace",
      entityId: id,
      action: "workspace.delete",
      before: existing,
    });
    return { ok: true };
  }

  private async loadWorkspace(id: string) {
    const [row] = await this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, id))
      .limit(1);
    if (!row) throw new NotFoundException("Workspace not found.");
    return row;
  }

  private async assertRole(userId: string, workspaceId: string, allowed: Array<"OWNER" | "ADMIN" | "MEMBER">) {
    const [member] = await this.db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)),
      )
      .limit(1);
    if (!member) throw new ForbiddenException("Not a member of this workspace.");
    if (!allowed.includes(member.role)) {
      throw new ForbiddenException(`Requires ${allowed.join(" or ")} role.`);
    }
  }

  private async uniqueSlug(seed: string): Promise<string> {
    for (let i = 0; i < 6; i++) {
      const candidate = i === 0 ? seed : `${seed}-${randomTag()}`;
      const [taken] = await this.db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.slug, candidate))
        .limit(1);
      if (!taken) return candidate;
    }
    return `${seed}-${randomTag()}${randomTag()}`;
  }
}

function randomTag(): string {
  return Math.random().toString(36).slice(2, 7);
}
