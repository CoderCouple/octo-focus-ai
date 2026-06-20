import {
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
  ProjectCreateSchema,
  ProjectUpdateSchema,
  type ProjectCreate,
  type ProjectUpdate,
} from "@octofocus/shared";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { AuthenticatedRequest } from "../auth/supabase-auth.guard";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { ChangeEventsService } from "../common/change-events.service";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { Database, DRIZZLE } from "../db/database.module";
import { projects, workspaceMembers } from "../db/schema";

const UuidParam = new ZodValidationPipe(z.string().uuid());

@Controller()
@UseGuards(SupabaseAuthGuard)
export class ProjectsController {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly changeEvents: ChangeEventsService,
  ) {}

  @Get("workspaces/:workspaceId/projects")
  async list(
    @Param("workspaceId", UuidParam) workspaceId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.assertMember(request.user.id, workspaceId);
    return this.db
      .select()
      .from(projects)
      .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.archivedAt)))
      .orderBy(desc(projects.updatedAt));
  }

  @Post("workspaces/:workspaceId/projects")
  async create(
    @Param("workspaceId", UuidParam) workspaceId: string,
    @Body(new ZodValidationPipe(ProjectCreateSchema)) body: ProjectCreate,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.assertMember(request.user.id, workspaceId);
    const [row] = await this.db
      .insert(projects)
      .values({
        workspaceId,
        name: body.name,
        description: body.description ?? null,
        icon: body.icon ?? null,
      })
      .returning();
    await this.changeEvents.record({
      workspaceId,
      actorType: "USER",
      userId: request.user.id,
      entityType: "project",
      entityId: row.id,
      action: "project.create",
      after: row,
    });
    return row;
  }

  @Get("projects/:id")
  async getOne(@Param("id", UuidParam) id: string, @Req() request: AuthenticatedRequest) {
    const project = await this.loadProject(id);
    await this.assertMember(request.user.id, project.workspaceId);
    return project;
  }

  @Patch("projects/:id")
  async update(
    @Param("id", UuidParam) id: string,
    @Body(new ZodValidationPipe(ProjectUpdateSchema)) body: ProjectUpdate,
    @Req() request: AuthenticatedRequest,
  ) {
    const existing = await this.loadProject(id);
    await this.assertMember(request.user.id, existing.workspaceId);

    const [row] = await this.db
      .update(projects)
      .set({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.icon !== undefined ? { icon: body.icon } : {}),
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();
    await this.changeEvents.record({
      workspaceId: existing.workspaceId,
      actorType: "USER",
      userId: request.user.id,
      entityType: "project",
      entityId: id,
      action: "project.update",
      before: existing,
      after: row,
      patch: body,
    });
    return row;
  }

  @Delete("projects/:id")
  async archive(@Param("id", UuidParam) id: string, @Req() request: AuthenticatedRequest) {
    const existing = await this.loadProject(id);
    await this.assertMember(request.user.id, existing.workspaceId);

    const [row] = await this.db
      .update(projects)
      .set({ archivedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    await this.changeEvents.record({
      workspaceId: existing.workspaceId,
      actorType: "USER",
      userId: request.user.id,
      entityType: "project",
      entityId: id,
      action: "project.archive",
      before: existing,
      after: row,
    });
    return row;
  }

  private async loadProject(id: string) {
    const [row] = await this.db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!row) {
      throw new NotFoundException("Project not found.");
    }
    return row;
  }

  private async assertMember(userId: string, workspaceId: string) {
    const [member] = await this.db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)),
      )
      .limit(1);
    if (!member) {
      throw new ForbiddenException("Not a member of this workspace.");
    }
  }
}
