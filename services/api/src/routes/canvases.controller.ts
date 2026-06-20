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
  CanvasCreateSchema,
  CanvasUpdateSchema,
  type CanvasCreate,
  type CanvasUpdate,
} from "@octofocus/shared";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { AuthenticatedRequest } from "../auth/supabase-auth.guard";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { ChangeEventsService } from "../common/change-events.service";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { Database, DRIZZLE } from "../db/database.module";
import { canvases, projects, workspaceMembers } from "../db/schema";

const UuidParam = new ZodValidationPipe(z.string().uuid());

@Controller()
@UseGuards(SupabaseAuthGuard)
export class CanvasesController {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly changeEvents: ChangeEventsService,
  ) {}

  @Get("projects/:projectId/canvases")
  async list(
    @Param("projectId", UuidParam) projectId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const project = await this.loadProject(projectId);
    await this.assertMember(request.user.id, project.workspaceId);
    return this.db
      .select()
      .from(canvases)
      .where(and(eq(canvases.projectId, projectId), isNull(canvases.deletedAt)))
      .orderBy(desc(canvases.updatedAt));
  }

  @Post("projects/:projectId/canvases")
  async create(
    @Param("projectId", UuidParam) projectId: string,
    @Body(new ZodValidationPipe(CanvasCreateSchema)) body: CanvasCreate,
    @Req() request: AuthenticatedRequest,
  ) {
    const project = await this.loadProject(projectId);
    await this.assertMember(request.user.id, project.workspaceId);
    const [row] = await this.db
      .insert(canvases)
      .values({
        projectId,
        title: body.title,
        document: {},
      })
      .returning();
    await this.changeEvents.record({
      workspaceId: project.workspaceId,
      actorType: "USER",
      userId: request.user.id,
      entityType: "canvas",
      entityId: row.id,
      action: "canvas.create",
      after: row,
    });
    return row;
  }

  @Get("canvases/:id")
  async getOne(@Param("id", UuidParam) id: string, @Req() request: AuthenticatedRequest) {
    const canvas = await this.loadCanvas(id);
    const project = await this.loadProject(canvas.projectId);
    await this.assertMember(request.user.id, project.workspaceId);
    return canvas;
  }

  @Patch("canvases/:id")
  async update(
    @Param("id", UuidParam) id: string,
    @Body(new ZodValidationPipe(CanvasUpdateSchema)) body: CanvasUpdate,
    @Req() request: AuthenticatedRequest,
  ) {
    const canvas = await this.loadCanvas(id);
    const project = await this.loadProject(canvas.projectId);
    await this.assertMember(request.user.id, project.workspaceId);

    const [row] = await this.db
      .update(canvases)
      .set({
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.document !== undefined ? { document: body.document } : {}),
        ...(body.diagramSchema !== undefined ? { diagramSchema: body.diagramSchema } : {}),
        updatedAt: new Date(),
      })
      .where(eq(canvases.id, id))
      .returning();
    await this.changeEvents.record({
      workspaceId: project.workspaceId,
      actorType: "USER",
      userId: request.user.id,
      entityType: "canvas",
      entityId: id,
      action: "canvas.update",
      before: canvas,
      after: row,
      patch: body,
    });
    return row;
  }

  @Delete("canvases/:id")
  async softDelete(@Param("id", UuidParam) id: string, @Req() request: AuthenticatedRequest) {
    const canvas = await this.loadCanvas(id);
    const project = await this.loadProject(canvas.projectId);
    await this.assertMember(request.user.id, project.workspaceId);

    const [row] = await this.db
      .update(canvases)
      .set({ deletedAt: new Date() })
      .where(eq(canvases.id, id))
      .returning();
    await this.changeEvents.record({
      workspaceId: project.workspaceId,
      actorType: "USER",
      userId: request.user.id,
      entityType: "canvas",
      entityId: id,
      action: "canvas.delete",
      before: canvas,
      after: row,
    });
    return row;
  }

  private async loadCanvas(id: string) {
    const [row] = await this.db.select().from(canvases).where(eq(canvases.id, id)).limit(1);
    if (!row) throw new NotFoundException("Canvas not found.");
    return row;
  }

  private async loadProject(id: string) {
    const [row] = await this.db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!row) throw new NotFoundException("Project not found.");
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
    if (!member) throw new ForbiddenException("Not a member of this workspace.");
  }
}
