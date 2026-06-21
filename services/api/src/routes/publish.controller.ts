/**
 * Publish / unpublish endpoints. One slug namespace shared across
 * project/page/canvas; once allocated, the slug is sticky (never regenerated)
 * so external links stay valid through visibility flips.
 */
import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  PublishUpdateSchema,
  type PublishedResource,
  type PublishUpdate,
  type Visibility,
} from "@octofocus/shared";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { AuthenticatedRequest } from "../auth/supabase-auth.guard";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { ChangeEventsService } from "../common/change-events.service";
import { PermissionsService } from "../common/permissions.service";
import { SlugService } from "../common/slug.service";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { Database, DRIZZLE } from "../db/database.module";
import { canvases, pages, projects, workspaces } from "../db/schema";

const IdParam = new ZodValidationPipe(z.string().min(1).max(64));

@Controller()
@UseGuards(SupabaseAuthGuard)
export class PublishController {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly permissions: PermissionsService,
    private readonly slugs: SlugService,
    private readonly changeEvents: ChangeEventsService,
  ) {}

  @Patch("projects/:id/publish")
  async publishProject(
    @Param("id", IdParam) id: string,
    @Body(new ZodValidationPipe(PublishUpdateSchema)) body: PublishUpdate,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.publish({ kind: "project", id, body, userId: req.user.id });
  }

  @Patch("pages/:id/publish")
  async publishPage(
    @Param("id", IdParam) id: string,
    @Body(new ZodValidationPipe(PublishUpdateSchema)) body: PublishUpdate,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.publish({ kind: "page", id, body, userId: req.user.id });
  }

  @Patch("canvases/:id/publish")
  async publishCanvas(
    @Param("id", IdParam) id: string,
    @Body(new ZodValidationPipe(PublishUpdateSchema)) body: PublishUpdate,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.publish({ kind: "canvas", id, body, userId: req.user.id });
  }

  private async publish(args: {
    kind: "project" | "page" | "canvas";
    id: string;
    body: PublishUpdate;
    userId: string;
  }): Promise<PublishedResource> {
    const { kind, id, body, userId } = args;
    const access = await this.permissions.require(userId, { kind, id }, "resource.publish");

    const existing = await this.loadResource(kind, id);
    const title =
      ("title" in existing && existing.title
        ? existing.title
        : (existing as { name?: string }).name) ?? "untitled";
    const publicSlug =
      existing.publicSlug ?? (await this.slugs.allocate(access.workspaceId, title));
    const now = new Date();
    const goingPublic = body.visibility !== "private" && existing.visibility === "private";

    const updates = {
      visibility: body.visibility,
      publicSlug,
      lastPublishedAt: body.visibility === "private" ? existing.lastPublishedAt : now,
      publishedAt:
        body.visibility === "private" ? existing.publishedAt : existing.publishedAt ?? now,
    };

    const row = await this.writeBack(kind, id, updates);
    await this.changeEvents.record({
      workspaceId: access.workspaceId,
      actorType: "USER",
      userId,
      entityType: kind,
      entityId: id,
      action: goingPublic ? `${kind}.publish` : `${kind}.visibility.update`,
      before: existing,
      after: row,
      patch: body,
    });

    const [ws] = await this.db
      .select({ slug: workspaces.slug })
      .from(workspaces)
      .where(eq(workspaces.id, access.workspaceId))
      .limit(1);
    if (!ws) throw new BadRequestException("Workspace missing slug.");

    return {
      resourceKind: kind,
      resourceId: id,
      publicSlug,
      visibility: row.visibility as Visibility,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
      lastPublishedAt: row.lastPublishedAt ? row.lastPublishedAt.toISOString() : null,
      workspaceSlug: ws.slug,
      publicUrl: `/p/${ws.slug}/${publicSlug}`,
    };
  }

  private async loadResource(
    kind: "project" | "page" | "canvas",
    id: string,
  ): Promise<{
    publicSlug: string | null;
    visibility: Visibility;
    publishedAt: Date | null;
    lastPublishedAt: Date | null;
    title?: string;
    name?: string;
  }> {
    if (kind === "project") {
      const [row] = await this.db.select().from(projects).where(eq(projects.id, id)).limit(1);
      if (!row) throw new NotFoundException("Project not found.");
      return row;
    }
    if (kind === "page") {
      const [row] = await this.db.select().from(pages).where(eq(pages.id, id)).limit(1);
      if (!row) throw new NotFoundException("Page not found.");
      return row;
    }
    const [row] = await this.db.select().from(canvases).where(eq(canvases.id, id)).limit(1);
    if (!row) throw new NotFoundException("Canvas not found.");
    return row;
  }

  private async writeBack(
    kind: "project" | "page" | "canvas",
    id: string,
    updates: {
      visibility: Visibility;
      publicSlug: string;
      publishedAt: Date | null;
      lastPublishedAt: Date | null;
    },
  ) {
    if (kind === "project") {
      const [row] = await this.db
        .update(projects)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning();
      return row;
    }
    if (kind === "page") {
      const [row] = await this.db
        .update(pages)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(pages.id, id))
        .returning();
      return row;
    }
    const [row] = await this.db
      .update(canvases)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(canvases.id, id))
      .returning();
    return row;
  }
}
