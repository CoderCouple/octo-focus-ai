/**
 * Canvas exports — render a canvas to a portable image asset with its own
 * public URL. The actual image bytes (svg/png) live in a bytea column; the
 * /public/i/:slug endpoint streams them out. Each export is its own row
 * with its own visibility so a canvas can stay private while a single
 * exported still gets shared.
 */
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  CanvasAssetCreateSchema,
  type CanvasAsset,
  type CanvasAssetCreate,
  type CanvasAssetFormat,
} from "@octofocus/shared";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { AuthenticatedRequest } from "../auth/supabase-auth.guard";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { ChangeEventsService } from "../common/change-events.service";
import { PermissionsService } from "../common/permissions.service";
import { SlugService } from "../common/slug.service";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { Database, DRIZZLE } from "../db/database.module";
import { canvasAssets, workspaces } from "../db/schema";

const IdParam = new ZodValidationPipe(z.string().min(1).max(64));

@Controller()
@UseGuards(SupabaseAuthGuard)
export class CanvasAssetsController {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly permissions: PermissionsService,
    private readonly slugs: SlugService,
    private readonly changeEvents: ChangeEventsService,
  ) {}

  @Post("canvases/:id/exports")
  async create(
    @Param("id", IdParam) canvasId: string,
    @Body(new ZodValidationPipe(CanvasAssetCreateSchema)) body: CanvasAssetCreate,
    @Req() req: AuthenticatedRequest,
  ): Promise<CanvasAsset> {
    const access = await this.permissions.require(
      req.user.id,
      { kind: "canvas", id: canvasId },
      "resource.share",
    );

    const buffer = decodeContent(body.content);
    if (buffer.length === 0) throw new BadRequestException("Empty export payload.");

    const slug = await this.slugs.allocate(
      access.workspaceId,
      body.title ?? `canvas-${body.format}`,
    );

    const [row] = await this.db
      .insert(canvasAssets)
      .values({
        canvasId,
        createdByUserId: req.user.id,
        publicSlug: slug,
        visibility: body.visibility,
        format: body.format,
        contentType: body.contentType,
        content: buffer,
        width: body.width ?? null,
        height: body.height ?? null,
        title: body.title ?? null,
      })
      .returning();
    if (!row) throw new BadRequestException("Failed to create export.");

    await this.changeEvents.record({
      workspaceId: access.workspaceId,
      actorType: "USER",
      userId: req.user.id,
      entityType: "canvas_asset",
      entityId: row.id,
      action: "canvas.export",
      after: { ...row, content: undefined },
    });

    return this.shape(row, await this.workspaceSlug(access.workspaceId));
  }

  @Get("canvases/:id/exports")
  async list(@Param("id", IdParam) canvasId: string, @Req() req: AuthenticatedRequest) {
    const access = await this.permissions.require(
      req.user.id,
      { kind: "canvas", id: canvasId },
      "resource.share",
    );
    const rows = await this.db
      .select()
      .from(canvasAssets)
      .where(eq(canvasAssets.canvasId, canvasId))
      .orderBy(desc(canvasAssets.createdAt));
    const wsSlug = await this.workspaceSlug(access.workspaceId);
    return rows.map((r) => this.shape(r, wsSlug));
  }

  @Delete("canvas-exports/:assetId")
  async revoke(
    @Param("assetId", IdParam) assetId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const [existing] = await this.db
      .select()
      .from(canvasAssets)
      .where(eq(canvasAssets.id, assetId))
      .limit(1);
    if (!existing) throw new NotFoundException("Export not found.");

    const access = await this.permissions.require(
      req.user.id,
      { kind: "canvas", id: existing.canvasId },
      "resource.share",
    );
    const [row] = await this.db
      .update(canvasAssets)
      .set({ revokedAt: new Date() })
      .where(eq(canvasAssets.id, assetId))
      .returning();

    await this.changeEvents.record({
      workspaceId: access.workspaceId,
      actorType: "USER",
      userId: req.user.id,
      entityType: "canvas_asset",
      entityId: assetId,
      action: "canvas.export.revoke",
      before: { ...existing, content: undefined },
      after: { ...row, content: undefined },
    });
    return this.shape(row, await this.workspaceSlug(access.workspaceId));
  }

  private async workspaceSlug(workspaceId: string): Promise<string> {
    const [ws] = await this.db
      .select({ slug: workspaces.slug })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    return ws?.slug ?? "";
  }

  private shape(row: typeof canvasAssets.$inferSelect, _workspaceSlug: string): CanvasAsset {
    const base = process.env.PUBLIC_APP_URL ?? "";
    const url = `${base}/i/${row.publicSlug}`;
    const altText = row.title ?? "canvas export";
    return {
      id: row.id,
      canvasId: row.canvasId,
      publicSlug: row.publicSlug ?? "",
      visibility: row.visibility,
      format: row.format as CanvasAssetFormat,
      contentType: row.contentType,
      width: row.width,
      height: row.height,
      title: row.title,
      createdAt: row.createdAt.toISOString(),
      revokedAt: row.revokedAt?.toISOString() ?? null,
      url,
      markdown: `![${altText}](${url})`,
    };
  }
}

function decodeContent(payload: string): Buffer {
  // Accept either a raw base64 string or a data URL ("data:...;base64,XYZ").
  const commaIdx = payload.indexOf("base64,");
  const base64 = commaIdx >= 0 ? payload.slice(commaIdx + "base64,".length) : payload;
  try {
    return Buffer.from(base64, "base64");
  } catch {
    throw new BadRequestException("Invalid base64 payload.");
  }
}
