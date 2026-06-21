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
  PageCreateSchema,
  PageUpdateSchema,
  type PageCreate,
  type PageUpdate,
} from "@octofocus/shared";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { AuthenticatedRequest } from "../auth/supabase-auth.guard";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { ChangeEventsService } from "../common/change-events.service";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { Database, DRIZZLE } from "../db/database.module";
import { pages, projects, workspaceMembers } from "../db/schema";

const IdParam = new ZodValidationPipe(z.string().min(1).max(64));

@Controller()
@UseGuards(SupabaseAuthGuard)
export class PagesController {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly changeEvents: ChangeEventsService,
  ) {}

  @Get("projects/:projectId/pages")
  async list(
    @Param("projectId", IdParam) projectId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const project = await this.loadProject(projectId);
    await this.assertMember(request.user.id, project.workspaceId);
    return this.db
      .select()
      .from(pages)
      .where(and(eq(pages.projectId, projectId), isNull(pages.deletedAt)))
      .orderBy(desc(pages.updatedAt));
  }

  @Get("workspaces/:workspaceId/pages")
  async listForWorkspace(
    @Param("workspaceId", IdParam) workspaceId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.assertMember(request.user.id, workspaceId);
    const rows = await this.db
      .select({
        id: pages.id,
        title: pages.title,
        projectId: pages.projectId,
        projectName: projects.name,
        contentMd: pages.contentMd,
        publicSlug: pages.publicSlug,
        visibility: pages.visibility,
        updatedAt: pages.updatedAt,
        createdAt: pages.createdAt,
      })
      .from(pages)
      .innerJoin(projects, eq(pages.projectId, projects.id))
      .where(and(eq(projects.workspaceId, workspaceId), isNull(pages.deletedAt)))
      .orderBy(desc(pages.updatedAt));
    return rows;
  }

  @Post("projects/:projectId/pages")
  async create(
    @Param("projectId", IdParam) projectId: string,
    @Body(new ZodValidationPipe(PageCreateSchema)) body: PageCreate,
    @Req() request: AuthenticatedRequest,
  ) {
    const project = await this.loadProject(projectId);
    await this.assertMember(request.user.id, project.workspaceId);
    // 1:1 — reject if this project already has an active page.
    const [existing] = await this.db
      .select({ id: pages.id })
      .from(pages)
      .where(and(eq(pages.projectId, projectId), isNull(pages.deletedAt)))
      .limit(1);
    if (existing) {
      throw new BadRequestException("This project already has a note.");
    }
    const [row] = await this.db
      .insert(pages)
      .values({ projectId, title: body.title, document: {} })
      .returning();
    await this.changeEvents.record({
      workspaceId: project.workspaceId,
      actorType: "USER",
      userId: request.user.id,
      entityType: "page",
      entityId: row.id,
      action: "page.create",
      after: row,
    });
    return row;
  }

  @Get("pages/:id")
  async getOne(@Param("id", IdParam) id: string, @Req() request: AuthenticatedRequest) {
    const page = await this.loadPage(id);
    const project = await this.loadProject(page.projectId);
    await this.assertMember(request.user.id, project.workspaceId);
    return page;
  }

  @Patch("pages/:id")
  async update(
    @Param("id", IdParam) id: string,
    @Body(new ZodValidationPipe(PageUpdateSchema)) body: PageUpdate,
    @Req() request: AuthenticatedRequest,
  ) {
    const page = await this.loadPage(id);
    const project = await this.loadProject(page.projectId);
    await this.assertMember(request.user.id, project.workspaceId);

    const [row] = await this.db
      .update(pages)
      .set({
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.document !== undefined ? { document: body.document } : {}),
        ...(body.contentMd !== undefined ? { contentMd: body.contentMd } : {}),
        updatedAt: new Date(),
      })
      .where(eq(pages.id, id))
      .returning();
    await this.changeEvents.record({
      workspaceId: project.workspaceId,
      actorType: "USER",
      userId: request.user.id,
      entityType: "page",
      entityId: id,
      action: "page.update",
      before: page,
      after: row,
      patch: body,
    });
    return row;
  }

  @Delete("pages/:id")
  async softDelete(@Param("id", IdParam) id: string, @Req() request: AuthenticatedRequest) {
    const page = await this.loadPage(id);
    const project = await this.loadProject(page.projectId);
    await this.assertMember(request.user.id, project.workspaceId);
    const [row] = await this.db
      .update(pages)
      .set({ deletedAt: new Date() })
      .where(eq(pages.id, id))
      .returning();
    await this.changeEvents.record({
      workspaceId: project.workspaceId,
      actorType: "USER",
      userId: request.user.id,
      entityType: "page",
      entityId: id,
      action: "page.delete",
      before: page,
      after: row,
    });
    return row;
  }

  private async loadPage(id: string) {
    const [row] = await this.db.select().from(pages).where(eq(pages.id, id)).limit(1);
    if (!row) throw new NotFoundException("Page not found.");
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
