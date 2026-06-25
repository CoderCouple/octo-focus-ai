/**
 * Public read paths — no auth.
 *
 *   GET  /public/p/:workspaceSlug/:slug   → resolve via PermissionsService
 *   POST /public/share/:token             → resolve + optional password
 *   GET  /public/i/:slug                  → asset bytes (returns model row)
 *
 * Service handles permission resolution + content lookup; the controller
 * builds the StreamableFile from canvas-asset bytes.
 */
import { Injectable } from "@nestjs/common";
import { createHash, timingSafeEqual } from "crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import type {
  PublicResourcePayload,
  PublicShareTokenPayload,
} from "../api/v1/response/public.response";
import { NotFound, Unauthorized } from "../common/error/error-factory";
import { PermissionsService } from "../common/permissions.service";
import { Database, DRIZZLE } from "../db/database.module";
import { CanvasAssetsRepository } from "../db/repository/canvas-assets.repository";
import { CanvasesRepository } from "../db/repository/canvases.repository";
import { PagesRepository } from "../db/repository/pages.repository";
import { ProjectsRepository } from "../db/repository/projects.repository";
import { ShareLinksRepository } from "../db/repository/share-links.repository";
import { canvases } from "../db/schemas/canvases";
import { pages } from "../db/schemas/pages";
import { workspaces } from "../db/schemas/workspaces";
import { Inject } from "@nestjs/common";
import type { ResourceKind } from "../model/sharing.model";

export type PublicLookupKind = "page" | "canvas" | "project";

export interface PublicLookupResult {
  kind: PublicLookupKind;
  workspaceSlug: string;
  publicSlug: string;
}

@Injectable()
export class PublicService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly permissions: PermissionsService,
    private readonly projectsRepo: ProjectsRepository,
    private readonly pagesRepo: PagesRepository,
    private readonly canvasesRepo: CanvasesRepository,
    private readonly assetsRepo: CanvasAssetsRepository,
    private readonly linksRepo: ShareLinksRepository,
  ) {}

  async getBySlug(workspaceSlug: string, slug: string): Promise<PublicResourcePayload> {
    const hit = await this.permissions.loadPublicByWorkspaceAndSlug(workspaceSlug, slug);
    if (!hit) throw NotFound("Resource not found.");

    if (hit.kind === "project") {
      const projectId = hit.row.id;
      const [firstPage] = await this.db
        .select()
        .from(pages)
        .where(and(eq(pages.projectId, projectId), isNull(pages.deletedAt)))
        .orderBy(desc(pages.updatedAt))
        .limit(1);
      const [firstCanvas] = await this.db
        .select()
        .from(canvases)
        .where(and(eq(canvases.projectId, projectId), isNull(canvases.deletedAt)))
        .orderBy(desc(canvases.updatedAt))
        .limit(1);
      return {
        kind: "project",
        workspaceSlug: hit.workspaceSlug,
        data: hit.row,
        page: firstPage ?? null,
        canvas: firstCanvas ?? null,
      };
    }
    return { kind: hit.kind, workspaceSlug: hit.workspaceSlug, data: hit.row };
  }

  async getByShareToken(token: string, password?: string): Promise<PublicShareTokenPayload> {
    const resolved = await this.permissions.resolveByToken(token);
    if (!resolved) throw NotFound("Share link not found.");

    if (resolved.link.passwordHash) {
      if (!password) throw Unauthorized("Password required.");
      const provided = createHash("sha256").update(password).digest();
      const stored = Buffer.from(resolved.link.passwordHash, "hex");
      if (provided.length !== stored.length || !timingSafeEqual(provided, stored)) {
        throw Unauthorized("Incorrect password.");
      }
    }

    await this.linksRepo.recordUse(resolved.link.id);

    const data = await this.loadResource(resolved.link.resourceKind, resolved.link.resourceId);
    if (!data) throw NotFound("Resource missing.");
    return {
      kind: resolved.link.resourceKind,
      permission: resolved.permission,
      data,
    };
  }

  /**
   * Unauthenticated lookup for the focus-route redirect dance. Given
   * a resource id, returns its public URL coordinates (workspace
   * slug + public slug) IF the resource is publicly viewable (has a
   * publicSlug AND visibility is not `private`). Otherwise null.
   * Middleware uses this to send unauthenticated visitors of
   * `/note/<id>` straight to `/p/<ws>/<slug>` instead of /login.
   */
  async lookupById(
    kind: PublicLookupKind,
    id: string,
  ): Promise<PublicLookupResult | null> {
    let publicSlug: string | null = null;
    let visibility = "private";
    let workspaceId: string | null = null;

    if (kind === "project") {
      const row = await this.projectsRepo.findById(id);
      if (!row) return null;
      publicSlug = row.publicSlug;
      visibility = row.visibility;
      workspaceId = row.workspaceId;
    } else if (kind === "page") {
      const row = await this.pagesRepo.findById(id);
      if (!row) return null;
      publicSlug = row.publicSlug;
      visibility = row.visibility;
      const project = await this.projectsRepo.findById(row.projectId);
      if (!project) return null;
      workspaceId = project.workspaceId;
    } else {
      const row = await this.canvasesRepo.findById(id);
      if (!row) return null;
      publicSlug = row.publicSlug;
      visibility = row.visibility;
      const project = await this.projectsRepo.findById(row.projectId);
      if (!project) return null;
      workspaceId = project.workspaceId;
    }

    if (!publicSlug || visibility === "private" || !workspaceId) return null;

    const wsRows = await this.db
      .select({ slug: workspaces.slug })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    const workspaceSlug = wsRows[0]?.slug;
    if (!workspaceSlug) return null;

    return { kind, workspaceSlug, publicSlug };
  }

  /** Returns the asset row including content bytes for streaming. */
  async getImageBySlug(slug: string) {
    const asset = await this.assetsRepo.findByPublicSlug(slug);
    if (!asset || asset.revokedAt) throw NotFound("Image not found.");
    if (asset.visibility === "private") throw NotFound("Image not public.");
    return asset;
  }

  private async loadResource(kind: ResourceKind, id: string) {
    if (kind === "project") return this.projectsRepo.findById(id);
    if (kind === "page") return this.pagesRepo.findById(id);
    return this.canvasesRepo.findById(id);
  }
}
