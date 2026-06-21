/**
 * Sharing endpoints:
 *
 *   POST   /shares                       create a per-user/email share
 *   GET    /shares?kind=&id=             list shares for a resource
 *   PATCH  /shares/:id                   update permission / expiry / note
 *   DELETE /shares/:id                   revoke
 *   POST   /shares/:id/resend            re-send pending invite email
 *
 *   POST   /share-links                  create a share link (with optional password)
 *   GET    /share-links?kind=&id=        list links for a resource
 *   DELETE /share-links/:id              revoke
 *
 *   POST   /share/accept                 accept a pending invite (logged-in user)
 *
 * Email-invite flow: an invite for a non-member email becomes status='pending'
 * with grantedToEmail set. On accept (or first /me sync for a matching email)
 * we attach grantedToUserId and flip to 'active'.
 */
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
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ResourceKindSchema,
  ResourceShareCreateSchema,
  ResourceShareUpdateSchema,
  ShareLinkCreateSchema,
  type ResourceKind,
  type ResourceShare,
  type ResourceShareCreate,
  type ResourceShareUpdate,
  type ShareLink,
  type ShareLinkCreate,
} from "@octofocus/shared";
import { and, eq, isNull, or } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import type { AuthenticatedRequest } from "../auth/supabase-auth.guard";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { ChangeEventsService } from "../common/change-events.service";
import { PermissionsService } from "../common/permissions.service";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { Database, DRIZZLE } from "../db/database.module";
import { resourceShares, shareLinks, users, workspaces } from "../db/schema";
import { EmailService } from "../common/email.service";

const IdParam = new ZodValidationPipe(z.string().min(1).max(64));
const ListQuery = new ZodValidationPipe(
  z.object({ kind: ResourceKindSchema, id: z.string().min(1).max(64) }),
);
const AcceptBody = new ZodValidationPipe(z.object({ shareId: z.string().min(1).max(64) }));

@Controller()
@UseGuards(SupabaseAuthGuard)
export class SharesController {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly permissions: PermissionsService,
    private readonly changeEvents: ChangeEventsService,
    private readonly email: EmailService,
  ) {}

  // ---------------------------------------------------------------------------
  // resource_shares
  // ---------------------------------------------------------------------------

  @Post("shares")
  async createShare(
    @Body(new ZodValidationPipe(ResourceShareCreateSchema)) body: ResourceShareCreate,
    @Req() req: AuthenticatedRequest,
  ): Promise<ResourceShare> {
    const access = await this.permissions.require(
      req.user.id,
      { kind: body.resourceKind, id: body.resourceId },
      "resource.share",
    );

    let grantedToUserId: string | null = body.grantedToUserId ?? null;
    let pending = false;

    if (body.grantedToEmail) {
      const [existingUser] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, body.grantedToEmail))
        .limit(1);
      if (existingUser) {
        grantedToUserId = existingUser.id;
      } else {
        pending = true;
      }
    }

    const [row] = await this.db
      .insert(resourceShares)
      .values({
        workspaceId: access.workspaceId,
        resourceKind: body.resourceKind,
        resourceId: body.resourceId,
        grantedToUserId: pending ? null : grantedToUserId,
        grantedToEmail: pending ? body.grantedToEmail ?? null : null,
        permission: body.permission,
        status: pending ? "pending" : "active",
        grantedByUserId: req.user.id,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        note: body.note ?? null,
        acceptedAt: pending ? null : new Date(),
      })
      .returning();
    if (!row) throw new BadRequestException("Failed to create share.");

    if (pending && body.grantedToEmail) {
      await this.email.sendInvite({
        to: body.grantedToEmail,
        inviter: req.user.email ?? "Someone",
        resourceKind: body.resourceKind,
        resourceId: body.resourceId,
        shareId: row.id,
      });
    }

    await this.changeEvents.record({
      workspaceId: access.workspaceId,
      actorType: "USER",
      userId: req.user.id,
      entityType: "resource_share",
      entityId: row.id,
      action: pending ? "share.invite" : "share.grant",
      after: row,
    });
    return this.toShare(row);
  }

  @Get("shares")
  async listShares(
    @Query(ListQuery) query: { kind: ResourceKind; id: string },
    @Req() req: AuthenticatedRequest,
  ) {
    await this.permissions.require(
      req.user.id,
      { kind: query.kind, id: query.id },
      "resource.share",
    );
    const rows = await this.db
      .select()
      .from(resourceShares)
      .where(
        and(
          eq(resourceShares.resourceKind, query.kind),
          eq(resourceShares.resourceId, query.id),
          or(eq(resourceShares.status, "active"), eq(resourceShares.status, "pending")),
        ),
      );
    return rows.map((r) => this.toShare(r));
  }

  @Patch("shares/:id")
  async updateShare(
    @Param("id", IdParam) id: string,
    @Body(new ZodValidationPipe(ResourceShareUpdateSchema)) body: ResourceShareUpdate,
    @Req() req: AuthenticatedRequest,
  ) {
    const existing = await this.loadShare(id);
    await this.permissions.require(
      req.user.id,
      { kind: existing.resourceKind, id: existing.resourceId },
      "resource.share",
    );
    const [row] = await this.db
      .update(resourceShares)
      .set({
        ...(body.permission !== undefined ? { permission: body.permission } : {}),
        ...(body.expiresAt !== undefined
          ? { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }
          : {}),
        ...(body.note !== undefined ? { note: body.note } : {}),
        updatedAt: new Date(),
      })
      .where(eq(resourceShares.id, id))
      .returning();
    return this.toShare(row);
  }

  @Delete("shares/:id")
  async revokeShare(@Param("id", IdParam) id: string, @Req() req: AuthenticatedRequest) {
    const existing = await this.loadShare(id);
    await this.permissions.require(
      req.user.id,
      { kind: existing.resourceKind, id: existing.resourceId },
      "resource.share",
    );
    const [row] = await this.db
      .update(resourceShares)
      .set({ status: "revoked", revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(resourceShares.id, id))
      .returning();
    await this.changeEvents.record({
      workspaceId: existing.workspaceId,
      actorType: "USER",
      userId: req.user.id,
      entityType: "resource_share",
      entityId: id,
      action: "share.revoke",
      before: existing,
      after: row,
    });
    return this.toShare(row);
  }

  @Post("shares/:id/resend")
  async resendShare(@Param("id", IdParam) id: string, @Req() req: AuthenticatedRequest) {
    const existing = await this.loadShare(id);
    if (existing.status !== "pending" || !existing.grantedToEmail) {
      throw new BadRequestException("Only pending email invites can be resent.");
    }
    await this.permissions.require(
      req.user.id,
      { kind: existing.resourceKind, id: existing.resourceId },
      "resource.share",
    );
    await this.email.sendInvite({
      to: existing.grantedToEmail,
      inviter: req.user.email ?? "Someone",
      resourceKind: existing.resourceKind,
      resourceId: existing.resourceId,
      shareId: existing.id,
    });
    return { ok: true };
  }

  @Post("share/accept")
  async acceptShare(
    @Body(AcceptBody) body: { shareId: string },
    @Req() req: AuthenticatedRequest,
  ) {
    const existing = await this.loadShare(body.shareId);
    if (existing.status !== "pending") {
      throw new BadRequestException("Share is not pending.");
    }
    if (!existing.grantedToEmail) {
      throw new BadRequestException("Share is not an email invite.");
    }
    if (existing.grantedToEmail.toLowerCase() !== req.user.email?.toLowerCase()) {
      throw new ForbiddenException("This invite is for a different email.");
    }
    const [row] = await this.db
      .update(resourceShares)
      .set({
        grantedToUserId: req.user.id,
        grantedToEmail: null,
        status: "active",
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(resourceShares.id, body.shareId))
      .returning();
    await this.changeEvents.record({
      workspaceId: existing.workspaceId,
      actorType: "USER",
      userId: req.user.id,
      entityType: "resource_share",
      entityId: body.shareId,
      action: "share.accept",
      before: existing,
      after: row,
    });
    return this.toShare(row);
  }

  // ---------------------------------------------------------------------------
  // share_links
  // ---------------------------------------------------------------------------

  @Post("share-links")
  async createLink(
    @Body(new ZodValidationPipe(ShareLinkCreateSchema)) body: ShareLinkCreate,
    @Req() req: AuthenticatedRequest,
  ): Promise<ShareLink> {
    const access = await this.permissions.require(
      req.user.id,
      { kind: body.resourceKind, id: body.resourceId },
      "resource.share",
    );
    const token = randomBytes(18).toString("base64url");
    const passwordHash = body.password
      ? createHash("sha256").update(body.password).digest("hex")
      : null;

    const [row] = await this.db
      .insert(shareLinks)
      .values({
        workspaceId: access.workspaceId,
        resourceKind: body.resourceKind,
        resourceId: body.resourceId,
        token,
        permission: body.permission,
        passwordHash,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        maxUses: body.maxUses ?? null,
        createdByUserId: req.user.id,
        note: body.note ?? null,
      })
      .returning();
    if (!row) throw new BadRequestException("Failed to create share link.");

    await this.changeEvents.record({
      workspaceId: access.workspaceId,
      actorType: "USER",
      userId: req.user.id,
      entityType: "share_link",
      entityId: row.id,
      action: "link.create",
      after: row,
    });
    return this.toLink(row);
  }

  @Get("share-links")
  async listLinks(
    @Query(ListQuery) query: { kind: ResourceKind; id: string },
    @Req() req: AuthenticatedRequest,
  ) {
    await this.permissions.require(
      req.user.id,
      { kind: query.kind, id: query.id },
      "resource.share",
    );
    const rows = await this.db
      .select()
      .from(shareLinks)
      .where(
        and(
          eq(shareLinks.resourceKind, query.kind),
          eq(shareLinks.resourceId, query.id),
          isNull(shareLinks.revokedAt),
        ),
      );
    return rows.map((r) => this.toLink(r));
  }

  @Delete("share-links/:id")
  async revokeLink(@Param("id", IdParam) id: string, @Req() req: AuthenticatedRequest) {
    const [existing] = await this.db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException("Share link not found.");
    await this.permissions.require(
      req.user.id,
      { kind: existing.resourceKind, id: existing.resourceId },
      "resource.share",
    );
    const [row] = await this.db
      .update(shareLinks)
      .set({ revokedAt: new Date() })
      .where(eq(shareLinks.id, id))
      .returning();
    await this.changeEvents.record({
      workspaceId: existing.workspaceId,
      actorType: "USER",
      userId: req.user.id,
      entityType: "share_link",
      entityId: id,
      action: "link.revoke",
      before: existing,
      after: row,
    });
    return this.toLink(row);
  }

  // ---------------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------------

  private async loadShare(id: string) {
    const [row] = await this.db
      .select()
      .from(resourceShares)
      .where(eq(resourceShares.id, id))
      .limit(1);
    if (!row) throw new NotFoundException("Share not found.");
    return row;
  }

  private toShare(row: typeof resourceShares.$inferSelect): ResourceShare {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      resourceKind: row.resourceKind,
      resourceId: row.resourceId,
      grantedToUserId: row.grantedToUserId,
      grantedToEmail: row.grantedToEmail,
      permission: row.permission,
      status: row.status,
      grantedByUserId: row.grantedByUserId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      acceptedAt: row.acceptedAt?.toISOString() ?? null,
      revokedAt: row.revokedAt?.toISOString() ?? null,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      note: row.note,
    };
  }

  private toLink(row: typeof shareLinks.$inferSelect): ShareLink {
    const base = process.env.PUBLIC_APP_URL ?? "";
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      resourceKind: row.resourceKind,
      resourceId: row.resourceId,
      token: row.token,
      permission: row.permission,
      hasPassword: row.passwordHash != null,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      maxUses: row.maxUses ?? null,
      useCount: row.useCount,
      revokedAt: row.revokedAt?.toISOString() ?? null,
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt.toISOString(),
      lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
      note: row.note,
      url: `${base}/share/${row.token}`,
    };
  }
}

// Silence the unused-name list narrowing — `workspaces` is referenced via FK only.
void workspaces;
