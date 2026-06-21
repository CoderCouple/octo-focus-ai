/**
 * Public read endpoints — NO auth guard. Two paths:
 *   GET  /public/p/:workspaceSlug/:slug
 *   POST /public/share/:token  (body may contain { password })
 *
 * Caller is the Next.js public route which sets an edge-cache TTL of 60s.
 */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { createHash, timingSafeEqual } from "crypto";
import type { ResourceKind } from "@octofocus/shared";
import { PermissionsService } from "../common/permissions.service";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { Database, DRIZZLE } from "../db/database.module";
import { canvases, pages, projects, shareLinks } from "../db/schema";

const SlugParam = new ZodValidationPipe(z.string().min(1).max(120));
const TokenParam = new ZodValidationPipe(z.string().min(8).max(64));
const ShareBody = new ZodValidationPipe(z.object({ password: z.string().min(1).max(200).optional() }));

@Controller("public")
export class PublicController {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly permissions: PermissionsService,
  ) {}

  @Get("p/:workspaceSlug/:slug")
  async getBySlug(
    @Param("workspaceSlug", SlugParam) workspaceSlug: string,
    @Param("slug", SlugParam) slug: string,
  ) {
    const hit = await this.permissions.loadPublicByWorkspaceAndSlug(workspaceSlug, slug);
    if (!hit) throw new NotFoundException("Resource not found.");

    // Publishing a project should surface its actual content, not just a
    // header. Inherit visibility from the project: the first page + first
    // canvas (newest by updatedAt) ride along in the same payload.
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
        kind: "project" as const,
        workspaceSlug: hit.workspaceSlug,
        data: hit.row,
        page: firstPage ?? null,
        canvas: firstCanvas ?? null,
      };
    }

    return this.shape(hit.kind, hit.row, hit.workspaceSlug);
  }

  @Post("share/:token")
  async getByShareToken(
    @Param("token", TokenParam) token: string,
    @Body(ShareBody) body: { password?: string },
  ) {
    const resolved = await this.permissions.resolveByToken(token);
    if (!resolved) throw new NotFoundException("Share link not found.");

    if (resolved.link.passwordHash) {
      if (!body.password) {
        throw new UnauthorizedException("Password required.");
      }
      const provided = createHash("sha256").update(body.password).digest();
      const stored = Buffer.from(resolved.link.passwordHash, "hex");
      if (provided.length !== stored.length || !timingSafeEqual(provided, stored)) {
        throw new UnauthorizedException("Incorrect password.");
      }
    }

    await this.db
      .update(shareLinks)
      .set({ useCount: sql`${shareLinks.useCount} + 1`, lastUsedAt: new Date() })
      .where(eq(shareLinks.id, resolved.link.id));

    const row = await this.loadResource(resolved.link.resourceKind, resolved.link.resourceId);
    if (!row) throw new NotFoundException("Resource missing.");
    return {
      kind: resolved.link.resourceKind,
      permission: resolved.permission,
      data: row,
    };
  }

  private async loadResource(kind: ResourceKind, id: string) {
    if (kind === "project") {
      const [row] = await this.db.select().from(projects).where(eq(projects.id, id)).limit(1);
      return row ?? null;
    }
    if (kind === "page") {
      const [row] = await this.db.select().from(pages).where(eq(pages.id, id)).limit(1);
      return row ?? null;
    }
    const [row] = await this.db.select().from(canvases).where(eq(canvases.id, id)).limit(1);
    return row ?? null;
  }

  private shape(kind: ResourceKind, row: Record<string, unknown>, workspaceSlug: string) {
    if (!row || typeof row !== "object") throw new BadRequestException("Bad resource shape.");
    return { kind, workspaceSlug, data: row };
  }
}
