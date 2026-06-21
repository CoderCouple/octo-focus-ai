/**
 * Canvas-export business logic. Permission is checked through
 * PermissionsService.require with the "resource.share" gate so that
 * collaborators who can share a canvas can also produce embeds.
 *
 * Heavy bytea reads (the content buffer) are intentionally stripped from
 * audit payloads.
 */
import { Injectable } from "@nestjs/common";
import type { CanvasAssetCreate } from "../api/v1/request/canvas.request";
import { ChangeEventsService } from "../common/change-events.service";
import { BadRequest, NotFound } from "../common/error/error-factory";
import { PermissionsService } from "../common/permissions.service";
import { SlugService } from "../common/slug.service";
import { CanvasAssetsRepository } from "../db/repository/canvas-assets.repository";
import { toCanvasAsset, type CanvasAsset } from "../model/canvas.model";

function decodeContent(payload: string): Buffer {
  const commaIdx = payload.indexOf("base64,");
  const base64 = commaIdx >= 0 ? payload.slice(commaIdx + "base64,".length) : payload;
  try {
    return Buffer.from(base64, "base64");
  } catch {
    throw BadRequest("Invalid base64 payload.");
  }
}

@Injectable()
export class CanvasAssetsService {
  constructor(
    private readonly assetsRepo: CanvasAssetsRepository,
    private readonly permissions: PermissionsService,
    private readonly slugs: SlugService,
    private readonly changeEvents: ChangeEventsService,
  ) {}

  async create(
    canvasId: string,
    input: CanvasAssetCreate,
    actorUserId: string,
  ): Promise<CanvasAsset> {
    const access = await this.permissions.require(
      actorUserId,
      { kind: "canvas", id: canvasId },
      "resource.share",
    );

    const buffer = decodeContent(input.content);
    if (buffer.length === 0) throw BadRequest("Empty export payload.");

    const slug = await this.slugs.allocate(
      access.workspaceId,
      input.title ?? `canvas-${input.format}`,
    );

    const row = await this.assetsRepo.insert({
      canvasId,
      createdByUserId: actorUserId,
      publicSlug: slug,
      visibility: input.visibility,
      format: input.format,
      contentType: input.contentType,
      content: buffer,
      width: input.width ?? null,
      height: input.height ?? null,
      title: input.title ?? null,
    });

    await this.changeEvents.record({
      workspaceId: access.workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "canvas_asset",
      entityId: row.id,
      action: "canvas.export",
      // omit raw bytes from the audit row
      after: { ...row, content: undefined },
    });

    return toCanvasAsset(row);
  }

  async listForCanvas(canvasId: string, actorUserId: string): Promise<CanvasAsset[]> {
    await this.permissions.require(
      actorUserId,
      { kind: "canvas", id: canvasId },
      "resource.share",
    );
    const rows = await this.assetsRepo.listByCanvas(canvasId);
    return rows.map(toCanvasAsset);
  }

  async revoke(assetId: string, actorUserId: string): Promise<CanvasAsset> {
    const existing = await this.assetsRepo.findById(assetId);
    if (!existing) throw NotFound("Export not found.");
    const access = await this.permissions.require(
      actorUserId,
      { kind: "canvas", id: existing.canvasId },
      "resource.share",
    );
    const updated = await this.assetsRepo.revokeById(assetId);
    if (!updated) throw NotFound("Export not found.");
    await this.changeEvents.record({
      workspaceId: access.workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "canvas_asset",
      entityId: assetId,
      action: "canvas.export.revoke",
      before: { ...existing, content: undefined },
      after: { ...updated, content: undefined },
    });
    return toCanvasAsset(updated);
  }
}
