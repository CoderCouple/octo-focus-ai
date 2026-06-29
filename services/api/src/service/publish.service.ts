/**
 * Publish / unpublish for project, page, and canvas. Public slugs are
 * allocated lazily on first publish and sticky thereafter — flipping
 * visibility back to private doesn't reset the slug, so external links
 * stay valid through subsequent re-publishes.
 */
import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { PublishUpdate } from "../api/v1/request/publish.request";
import type { PublishedResourceDto } from "../api/v1/response/publish.response";
import { ChangeEventsService } from "../common/change-events.service";
import { BadRequest, NotFound } from "../common/error/error-factory";
import { PermissionsService } from "../common/permissions.service";
import { SlugService } from "../common/slug.service";
import { Database, DRIZZLE } from "../db/database.module";
import { CanvasesRepository } from "../db/repository/canvases.repository";
import { PagesRepository } from "../db/repository/pages.repository";
import { ProjectsRepository } from "../db/repository/projects.repository";
import { workspaces } from "../db/schemas/workspaces";
import { Inject } from "@nestjs/common";
import type { Visibility } from "../model/project.model";

interface ResourceCommonShape {
  publicSlug: string | null;
  visibility: Visibility;
  publishedAt: Date | null;
  lastPublishedAt: Date | null;
}

@Injectable()
export class PublishService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly projectsRepo: ProjectsRepository,
    private readonly pagesRepo: PagesRepository,
    private readonly canvasesRepo: CanvasesRepository,
    private readonly permissions: PermissionsService,
    private readonly slugs: SlugService,
    private readonly changeEvents: ChangeEventsService,
  ) {}

  async publish(
    kind: "project" | "page" | "canvas",
    id: string,
    patch: PublishUpdate,
    actorUserId: string,
  ): Promise<PublishedResourceDto> {
    const access = await this.permissions.require(actorUserId, { kind, id }, "resource.publish");
    const existing = await this.loadResource(kind, id);

    const title = this.titleOf(kind, existing);
    const publicSlug = existing.publicSlug ?? (await this.slugs.allocate(access.workspaceId, title));
    const now = new Date();
    const goingPublic = patch.visibility !== "private" && existing.visibility === "private";

    const updates = {
      visibility: patch.visibility,
      publicSlug,
      lastPublishedAt: patch.visibility === "private" ? existing.lastPublishedAt : now,
      publishedAt:
        patch.visibility === "private"
          ? existing.publishedAt
          : existing.publishedAt ?? now,
    };

    const row = await this.writeBack(kind, id, updates);
    if (!row) throw NotFound("Resource not found.");

    await this.changeEvents.record({
      workspaceId: access.workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: kind,
      entityId: id,
      action: goingPublic ? `${kind}.publish` : `${kind}.visibility.update`,
      before: existing,
      after: row,
      patch,
    });

    // Cascade visibility from project to its 1:1 children. Projects
    // are containers in the product UX; publishing the parent without
    // also publishing the page + canvas means the reader hits a 404
    // (or "private") the moment they click through. Each child gets
    // its own slug and its own change_event so the audit trail is
    // honest per resource.
    if (kind === "project") {
      await this.cascadePublishChildren(id, access.workspaceId, patch, actorUserId);
    }

    const [ws] = await this.db
      .select({ slug: workspaces.slug })
      .from(workspaces)
      .where(eq(workspaces.id, access.workspaceId))
      .limit(1);
    if (!ws) throw BadRequest("Workspace missing slug.");

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
  ): Promise<ResourceCommonShape & { title?: string; name?: string }> {
    if (kind === "project") {
      const row = await this.projectsRepo.findById(id);
      if (!row) throw NotFound("Project not found.");
      return row;
    }
    if (kind === "page") {
      const row = await this.pagesRepo.findById(id);
      if (!row) throw NotFound("Page not found.");
      return row;
    }
    const row = await this.canvasesRepo.findById(id);
    if (!row) throw NotFound("Canvas not found.");
    return row;
  }

  private titleOf(
    kind: "project" | "page" | "canvas",
    row: ResourceCommonShape & { title?: string; name?: string },
  ): string {
    if (kind === "project") return row.name ?? "untitled";
    return row.title ?? "untitled";
  }

  /**
   * Propagate the publish gesture from a project to each 1:1 child
   * (the page + the canvas). Same `visibility` + `publishedAt`
   * semantics as the parent — each child allocates its own slug if it
   * doesn't have one. Failures on a single child log + continue
   * rather than throwing mid-cascade, so partial success leaves the
   * project + at least one child published instead of nothing.
   */
  private async cascadePublishChildren(
    projectId: string,
    workspaceId: string,
    patch: PublishUpdate,
    actorUserId: string,
  ): Promise<void> {
    const [pages, canvases] = await Promise.all([
      this.pagesRepo.listByProject(projectId),
      this.canvasesRepo.listByProject(projectId),
    ]);
    const now = new Date();
    const goingPublic = patch.visibility !== "private";

    type ChildKind = "page" | "canvas";
    type ChildRow = ResourceCommonShape & { id: string; title?: string };

    const apply = async (childKind: ChildKind, child: ChildRow) => {
      try {
        const slug =
          child.publicSlug ??
          (await this.slugs.allocate(workspaceId, child.title ?? "untitled"));
        const updates = {
          visibility: patch.visibility,
          publicSlug: slug,
          lastPublishedAt: patch.visibility === "private" ? child.lastPublishedAt : now,
          publishedAt:
            patch.visibility === "private"
              ? child.publishedAt
              : child.publishedAt ?? now,
        };
        const after = await this.writeBack(childKind, child.id, updates);
        if (!after) return;
        await this.changeEvents.record({
          workspaceId,
          actorType: "USER",
          userId: actorUserId,
          entityType: childKind,
          entityId: child.id,
          action: goingPublic
            ? `${childKind}.publish`
            : `${childKind}.visibility.update`,
          before: child,
          after,
          patch,
          cascadedFrom: { kind: "project", id: projectId },
        } as never);
      } catch (err) {
        console.error(`cascadePublishChildren ${childKind} ${child.id} failed`, err);
      }
    };

    for (const p of pages) await apply("page", p as ChildRow);
    for (const c of canvases) await apply("canvas", c as ChildRow);
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
    const patch = { ...updates, updatedAt: new Date() };
    if (kind === "project") return this.projectsRepo.updateById(id, patch);
    if (kind === "page") return this.pagesRepo.updateById(id, patch);
    return this.canvasesRepo.updateById(id, patch);
  }
}
