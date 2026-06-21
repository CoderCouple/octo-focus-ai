/**
 * Permission resolution for projects, pages, and canvases.
 *
 * Resolution order (highest wins):
 *   1. Resource-level grant via resource_shares (per user, status='active').
 *   2. Inherited resource grant from the parent project (for page/canvas).
 *   3. Workspace membership floor: OWNER/ADMIN → admin, MEMBER → editor.
 *
 * Share-link tokens are resolved separately (resolveByToken) — they bypass
 * the user-identity path and grant the link's permission to whoever holds it.
 */
import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import type { ResourceKind, SharePermission } from "@octofocus/shared";
import { Database, DRIZZLE } from "../db/database.module";
import {
  canvases,
  pages,
  projects,
  resourceShares,
  shareLinks,
  workspaceMembers,
  workspaces,
} from "../db/schema";

export type Action =
  | "resource.view"
  | "resource.comment"
  | "resource.edit"
  | "resource.share"
  | "resource.delete"
  | "resource.publish";

const PERMISSION_RANK: Record<SharePermission, number> = {
  viewer: 1,
  commenter: 2,
  editor: 3,
  admin: 4,
};

const ACTION_REQUIREMENT: Record<Action, SharePermission> = {
  "resource.view": "viewer",
  "resource.comment": "commenter",
  "resource.edit": "editor",
  "resource.share": "admin",
  "resource.delete": "admin",
  "resource.publish": "admin",
};

export interface ResourceLocator {
  kind: ResourceKind;
  id: string;
}

export interface ResolvedAccess {
  workspaceId: string;
  permission: SharePermission;
  source: "membership" | "resource_share" | "inherited_share";
}

@Injectable()
export class PermissionsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async resolveForUser(userId: string, locator: ResourceLocator): Promise<ResolvedAccess> {
    const { workspaceId, parentProjectId } = await this.locateResource(locator);

    const membership = await this.membershipFloor(userId, workspaceId);
    const direct = await this.directShare(userId, locator);
    const inherited =
      parentProjectId != null
        ? await this.directShare(userId, { kind: "project", id: parentProjectId })
        : null;

    const candidates: ResolvedAccess[] = [];
    if (membership) candidates.push({ workspaceId, permission: membership, source: "membership" });
    if (direct) candidates.push({ workspaceId, permission: direct, source: "resource_share" });
    if (inherited)
      candidates.push({ workspaceId, permission: inherited, source: "inherited_share" });

    if (candidates.length === 0) {
      throw new NotFoundException("Resource not found.");
    }
    return candidates.reduce((best, next) =>
      PERMISSION_RANK[next.permission] > PERMISSION_RANK[best.permission] ? next : best,
    );
  }

  assert(access: ResolvedAccess, action: Action): void {
    if (PERMISSION_RANK[access.permission] < PERMISSION_RANK[ACTION_REQUIREMENT[action]]) {
      throw new ForbiddenException(`Insufficient permission for ${action}.`);
    }
  }

  async require(userId: string, locator: ResourceLocator, action: Action): Promise<ResolvedAccess> {
    const access = await this.resolveForUser(userId, locator);
    this.assert(access, action);
    return access;
  }

  async resolveByToken(token: string): Promise<{
    link: typeof shareLinks.$inferSelect;
    workspaceId: string;
    permission: SharePermission;
  } | null> {
    const [link] = await this.db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.token, token))
      .limit(1);
    if (!link) return null;
    if (link.revokedAt) return null;
    if (link.expiresAt && link.expiresAt.getTime() < Date.now()) return null;
    if (link.maxUses != null && link.useCount >= link.maxUses) return null;

    const located = await this.locateResource({
      kind: link.resourceKind,
      id: link.resourceId,
    }).catch(() => null);
    if (!located || located.workspaceId !== link.workspaceId) return null;

    return { link, workspaceId: link.workspaceId, permission: link.permission };
  }

  async loadPublicByWorkspaceAndSlug(
    workspaceSlug: string,
    publicSlug: string,
  ): Promise<
    | { kind: "project"; row: typeof projects.$inferSelect; workspaceSlug: string }
    | { kind: "page"; row: typeof pages.$inferSelect; workspaceSlug: string }
    | { kind: "canvas"; row: typeof canvases.$inferSelect; workspaceSlug: string }
    | null
  > {
    const [ws] = await this.db
      .select({ id: workspaces.id, slug: workspaces.slug })
      .from(workspaces)
      .where(eq(workspaces.slug, workspaceSlug))
      .limit(1);
    if (!ws) return null;

    const [project] = await this.db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, ws.id),
          eq(projects.publicSlug, publicSlug),
          inArray(projects.visibility, ["public", "unlisted"]),
        ),
      )
      .limit(1);
    if (project) return { kind: "project", row: project, workspaceSlug: ws.slug };

    const [page] = await this.db
      .select({ page: pages })
      .from(pages)
      .innerJoin(projects, eq(pages.projectId, projects.id))
      .where(
        and(
          eq(projects.workspaceId, ws.id),
          eq(pages.publicSlug, publicSlug),
          inArray(pages.visibility, ["public", "unlisted"]),
          isNull(pages.deletedAt),
        ),
      )
      .limit(1);
    if (page) return { kind: "page", row: page.page, workspaceSlug: ws.slug };

    const [canvas] = await this.db
      .select({ canvas: canvases })
      .from(canvases)
      .innerJoin(projects, eq(canvases.projectId, projects.id))
      .where(
        and(
          eq(projects.workspaceId, ws.id),
          eq(canvases.publicSlug, publicSlug),
          inArray(canvases.visibility, ["public", "unlisted"]),
          isNull(canvases.deletedAt),
        ),
      )
      .limit(1);
    if (canvas) return { kind: "canvas", row: canvas.canvas, workspaceSlug: ws.slug };

    return null;
  }

  private async locateResource(
    locator: ResourceLocator,
  ): Promise<{ workspaceId: string; parentProjectId: string | null }> {
    if (locator.kind === "project") {
      const [row] = await this.db
        .select({ workspaceId: projects.workspaceId })
        .from(projects)
        .where(eq(projects.id, locator.id))
        .limit(1);
      if (!row) throw new NotFoundException("Project not found.");
      return { workspaceId: row.workspaceId, parentProjectId: null };
    }
    if (locator.kind === "page") {
      const [row] = await this.db
        .select({ workspaceId: projects.workspaceId, projectId: projects.id })
        .from(pages)
        .innerJoin(projects, eq(pages.projectId, projects.id))
        .where(and(eq(pages.id, locator.id), isNull(pages.deletedAt)))
        .limit(1);
      if (!row) throw new NotFoundException("Page not found.");
      return { workspaceId: row.workspaceId, parentProjectId: row.projectId };
    }
    const [row] = await this.db
      .select({ workspaceId: projects.workspaceId, projectId: projects.id })
      .from(canvases)
      .innerJoin(projects, eq(canvases.projectId, projects.id))
      .where(and(eq(canvases.id, locator.id), isNull(canvases.deletedAt)))
      .limit(1);
    if (!row) throw new NotFoundException("Canvas not found.");
    return { workspaceId: row.workspaceId, parentProjectId: row.projectId };
  }

  private async membershipFloor(
    userId: string,
    workspaceId: string,
  ): Promise<SharePermission | null> {
    const [member] = await this.db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)),
      )
      .limit(1);
    if (!member) return null;
    return member.role === "MEMBER" ? "editor" : "admin";
  }

  private async directShare(
    userId: string,
    locator: ResourceLocator,
  ): Promise<SharePermission | null> {
    const [row] = await this.db
      .select({ permission: resourceShares.permission })
      .from(resourceShares)
      .where(
        and(
          eq(resourceShares.grantedToUserId, userId),
          eq(resourceShares.resourceKind, locator.kind),
          eq(resourceShares.resourceId, locator.id),
          eq(resourceShares.status, "active"),
          or(isNull(resourceShares.expiresAt), gt(resourceShares.expiresAt, sql`now()`)),
        ),
      )
      .limit(1);
    if (!row) return null;
    return row.permission;
  }
}
