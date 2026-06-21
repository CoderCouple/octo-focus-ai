/**
 * Per-user / per-email resource shares. Two creation paths:
 *
 *   - grantedToUserId set    → immediate active membership in the grant
 *   - grantedToEmail set
 *       · email already has a user  → attached + active
 *       · email is unknown          → pending share + invite email
 *
 * All routes through PermissionsService.require with the "resource.share"
 * gate; the share resource is then attached to that workspace.
 */
import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type {
  ResourceShareCreate,
  ResourceShareUpdate,
} from "../api/v1/request/sharing.request";
import { ChangeEventsService } from "../common/change-events.service";
import { EmailService } from "../common/email.service";
import { BadRequest, Forbidden, NotFound } from "../common/error/error-factory";
import { PermissionsService } from "../common/permissions.service";
import { Database, DRIZZLE } from "../db/database.module";
import { ResourceSharesRepository } from "../db/repository/resource-shares.repository";
import { users } from "../db/schemas/users";
import { Inject } from "@nestjs/common";
import { toResourceShare, type ResourceKind, type ResourceShare } from "../model/sharing.model";

@Injectable()
export class SharesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly sharesRepo: ResourceSharesRepository,
    private readonly permissions: PermissionsService,
    private readonly email: EmailService,
    private readonly changeEvents: ChangeEventsService,
  ) {}

  async create(
    input: ResourceShareCreate,
    actorUserId: string,
    actorEmail: string | undefined,
  ): Promise<ResourceShare> {
    const access = await this.permissions.require(
      actorUserId,
      { kind: input.resourceKind, id: input.resourceId },
      "resource.share",
    );

    let grantedToUserId: string | null = input.grantedToUserId ?? null;
    let pending = false;
    if (input.grantedToEmail) {
      const [existing] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.grantedToEmail))
        .limit(1);
      if (existing) grantedToUserId = existing.id;
      else pending = true;
    }

    const row = await this.sharesRepo.insert({
      workspaceId: access.workspaceId,
      resourceKind: input.resourceKind,
      resourceId: input.resourceId,
      grantedToUserId: pending ? null : grantedToUserId,
      grantedToEmail: pending ? input.grantedToEmail ?? null : null,
      permission: input.permission,
      status: pending ? "pending" : "active",
      grantedByUserId: actorUserId,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      note: input.note ?? null,
      acceptedAt: pending ? null : new Date(),
    });

    if (pending && input.grantedToEmail) {
      await this.email.sendInvite({
        to: input.grantedToEmail,
        inviter: actorEmail ?? "Someone",
        resourceKind: input.resourceKind,
        resourceId: input.resourceId,
        shareId: row.id,
      });
    }

    await this.changeEvents.record({
      workspaceId: access.workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "resource_share",
      entityId: row.id,
      action: pending ? "share.invite" : "share.grant",
      after: row,
    });

    return toResourceShare(row);
  }

  async list(
    resourceKind: ResourceKind,
    resourceId: string,
    actorUserId: string,
  ): Promise<ResourceShare[]> {
    await this.permissions.require(actorUserId, { kind: resourceKind, id: resourceId }, "resource.share");
    const rows = await this.sharesRepo.listActiveAndPendingFor(resourceKind, resourceId);
    return rows.map(toResourceShare);
  }

  async update(
    id: string,
    patch: ResourceShareUpdate,
    actorUserId: string,
  ): Promise<ResourceShare> {
    const existing = await this.sharesRepo.findById(id);
    if (!existing) throw NotFound("Share not found.");
    await this.permissions.require(
      actorUserId,
      { kind: existing.resourceKind, id: existing.resourceId },
      "resource.share",
    );
    const updated = await this.sharesRepo.updateById(id, {
      ...(patch.permission !== undefined ? { permission: patch.permission } : {}),
      ...(patch.expiresAt !== undefined
        ? { expiresAt: patch.expiresAt ? new Date(patch.expiresAt) : null }
        : {}),
      ...(patch.note !== undefined ? { note: patch.note } : {}),
      updatedAt: new Date(),
    });
    if (!updated) throw NotFound("Share not found.");
    return toResourceShare(updated);
  }

  async revoke(id: string, actorUserId: string): Promise<ResourceShare> {
    const existing = await this.sharesRepo.findById(id);
    if (!existing) throw NotFound("Share not found.");
    await this.permissions.require(
      actorUserId,
      { kind: existing.resourceKind, id: existing.resourceId },
      "resource.share",
    );
    const updated = await this.sharesRepo.updateById(id, {
      status: "revoked",
      revokedAt: new Date(),
      updatedAt: new Date(),
    });
    if (!updated) throw NotFound("Share not found.");
    await this.changeEvents.record({
      workspaceId: existing.workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "resource_share",
      entityId: id,
      action: "share.revoke",
      before: existing,
      after: updated,
    });
    return toResourceShare(updated);
  }

  async resend(id: string, actorUserId: string, actorEmail: string | undefined): Promise<void> {
    const existing = await this.sharesRepo.findById(id);
    if (!existing) throw NotFound("Share not found.");
    if (existing.status !== "pending" || !existing.grantedToEmail) {
      throw BadRequest("Only pending email invites can be resent.");
    }
    await this.permissions.require(
      actorUserId,
      { kind: existing.resourceKind, id: existing.resourceId },
      "resource.share",
    );
    await this.email.sendInvite({
      to: existing.grantedToEmail,
      inviter: actorEmail ?? "Someone",
      resourceKind: existing.resourceKind,
      resourceId: existing.resourceId,
      shareId: existing.id,
    });
  }

  async accept(
    shareId: string,
    actorUserId: string,
    actorEmail: string | undefined,
  ): Promise<ResourceShare> {
    const existing = await this.sharesRepo.findById(shareId);
    if (!existing) throw NotFound("Share not found.");
    if (existing.status !== "pending") throw BadRequest("Share is not pending.");
    if (!existing.grantedToEmail) throw BadRequest("Share is not an email invite.");
    if (existing.grantedToEmail.toLowerCase() !== actorEmail?.toLowerCase()) {
      throw Forbidden("This invite is for a different email.");
    }
    const updated = await this.sharesRepo.updateById(shareId, {
      grantedToUserId: actorUserId,
      grantedToEmail: null,
      status: "active",
      acceptedAt: new Date(),
      updatedAt: new Date(),
    });
    if (!updated) throw NotFound("Share not found.");
    await this.changeEvents.record({
      workspaceId: existing.workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "resource_share",
      entityId: shareId,
      action: "share.accept",
      before: existing,
      after: updated,
    });
    return toResourceShare(updated);
  }
}
