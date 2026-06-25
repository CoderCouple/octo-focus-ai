import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../database.module";
import { pages } from "../schemas/pages";
import { projects } from "../schemas/projects";
import { resourceShares } from "../schemas/sharing";
import { users } from "../schemas/users";
import { BaseRepository } from "./base.repository";

export interface PageCreatorSummary {
  id: string;
  name: string;
  email: string;
}

export interface WorkspacePageSummaryRow {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  contentMd: string;
  publicSlug: string | null;
  visibility: string;
  updatedAt: Date;
  createdAt: Date;
  creator: PageCreatorSummary | null;
  sharedCount: number;
}

@Injectable()
export class PagesRepository extends BaseRepository<typeof pages> {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db, pages);
  }

  async listByProject(projectId: string) {
    return this.db
      .select()
      .from(pages)
      .where(and(eq(pages.projectId, projectId), isNull(pages.deletedAt)))
      .orderBy(desc(pages.updatedAt));
  }

  /**
   * List every non-deleted note in the workspace alongside the user who
   * created it and how many people it's been shared with. Creator is
   * INNER-joined since createdByUserId is NOT NULL going forward; the
   * `creator: ... | null` field stays nullable as defensive code for
   * any pre-migration row that may slip through.
   */
  async listForWorkspace(workspaceId: string): Promise<WorkspacePageSummaryRow[]> {
    const rows = await this.db
      .select({
        id: pages.id,
        title: pages.title,
        projectId: pages.projectId,
        projectName: projects.name,
        contentMd: pages.contentMd,
        publicSlug: pages.publicSlug,
        visibility: pages.visibility,
        updatedAt: pages.updatedAt,
        createdAt: pages.createdAt,
        createdByUserId: pages.createdByUserId,
        creatorId: users.id,
        creatorName: users.name,
        creatorEmail: users.email,
      })
      .from(pages)
      .innerJoin(projects, eq(pages.projectId, projects.id))
      .leftJoin(users, eq(pages.createdByUserId, users.id))
      .where(and(eq(projects.workspaceId, workspaceId), isNull(pages.deletedAt)))
      .orderBy(desc(pages.updatedAt));

    if (rows.length === 0) return [];

    const pageIds = rows.map((r) => r.id);
    const shareRows = await this.db
      .select({
        resourceId: resourceShares.resourceId,
        count: sql<number>`count(*)::int`,
      })
      .from(resourceShares)
      .where(
        and(
          eq(resourceShares.resourceKind, "page"),
          inArray(resourceShares.resourceId, pageIds),
          eq(resourceShares.status, "active"),
        ),
      )
      .groupBy(resourceShares.resourceId);

    const sharedById = new Map(shareRows.map((r) => [r.resourceId, Number(r.count)]));

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      projectId: r.projectId,
      projectName: r.projectName,
      contentMd: r.contentMd,
      publicSlug: r.publicSlug,
      visibility: r.visibility,
      updatedAt: r.updatedAt,
      createdAt: r.createdAt,
      creator:
        r.creatorId && r.creatorName && r.creatorEmail
          ? { id: r.creatorId, name: r.creatorName, email: r.creatorEmail }
          : null,
      sharedCount: sharedById.get(r.id) ?? 0,
    }));
  }

  /** True if there's already a non-deleted page in this project (1:1 invariant). */
  async hasActiveInProject(projectId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: pages.id })
      .from(pages)
      .where(and(eq(pages.projectId, projectId), isNull(pages.deletedAt)))
      .limit(1);
    return rows.length > 0;
  }

  async softDeleteById(id: string) {
    const rows = await this.db
      .update(pages)
      .set({ deletedAt: new Date() })
      .where(eq(pages.id, id))
      .returning();
    return rows[0] ?? null;
  }
}
