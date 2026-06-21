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

  @Post("projects/:projectId/pages")
  async create(
    @Param("projectId", IdParam) projectId: string,
    @Body(new ZodValidationPipe(PageCreateSchema)) body: PageCreate,
    @Req() request: AuthenticatedRequest,
  ) {
    const project = await this.loadProject(projectId);
    await this.assertMember(request.user.id, project.workspaceId);
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
