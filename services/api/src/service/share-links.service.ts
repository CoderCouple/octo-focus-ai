/**
 * Token-based share links. The link itself carries the permission grant; the
 * resource and workspace are derived from the underlying resource. Passwords
 * are sha256-hashed at creation; we never store cleartext.
 */
import { Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import type { ShareLinkCreate } from "../api/v1/request/sharing.request";
import { ChangeEventsService } from "../common/change-events.service";
import { NotFound } from "../common/error/error-factory";
import { PermissionsService } from "../common/permissions.service";
import { ShareLinksRepository } from "../db/repository/share-links.repository";
import { toShareLink, type ResourceKind, type ShareLink } from "../model/sharing.model";

@Injectable()
export class ShareLinksService {
  constructor(
    private readonly linksRepo: ShareLinksRepository,
    private readonly permissions: PermissionsService,
    private readonly changeEvents: ChangeEventsService,
  ) {}

  async create(input: ShareLinkCreate, actorUserId: string): Promise<ShareLink> {
    const access = await this.permissions.require(
      actorUserId,
      { kind: input.resourceKind, id: input.resourceId },
      "resource.share",
    );
    const token = randomBytes(18).toString("base64url");
    const passwordHash = input.password
      ? createHash("sha256").update(input.password).digest("hex")
      : null;
    const row = await this.linksRepo.insert({
      workspaceId: access.workspaceId,
      resourceKind: input.resourceKind,
      resourceId: input.resourceId,
      token,
      permission: input.permission,
      passwordHash,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      maxUses: input.maxUses ?? null,
      createdByUserId: actorUserId,
      note: input.note ?? null,
    });
    await this.changeEvents.record({
      workspaceId: access.workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "share_link",
      entityId: row.id,
      action: "link.create",
      after: row,
    });
    return toShareLink(row);
  }

  async list(
    resourceKind: ResourceKind,
    resourceId: string,
    actorUserId: string,
  ): Promise<ShareLink[]> {
    await this.permissions.require(
      actorUserId,
      { kind: resourceKind, id: resourceId },
      "resource.share",
    );
    const rows = await this.linksRepo.listActiveFor(resourceKind, resourceId);
    return rows.map(toShareLink);
  }

  async revoke(id: string, actorUserId: string): Promise<ShareLink> {
    const existing = await this.linksRepo.findById(id);
    if (!existing) throw NotFound("Share link not found.");
    await this.permissions.require(
      actorUserId,
      { kind: existing.resourceKind, id: existing.resourceId },
      "resource.share",
    );
    const updated = await this.linksRepo.updateById(id, { revokedAt: new Date() });
    if (!updated) throw NotFound("Share link not found.");
    await this.changeEvents.record({
      workspaceId: existing.workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "share_link",
      entityId: id,
      action: "link.revoke",
      before: existing,
      after: updated,
    });
    return toShareLink(updated);
  }
}
