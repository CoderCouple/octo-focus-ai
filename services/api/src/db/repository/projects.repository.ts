import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../database.module";
import { canvases } from "../schemas/canvases";
import { pages } from "../schemas/pages";
import { projects } from "../schemas/projects";
import { resourceShares } from "../schemas/sharing";
import { users } from "../schemas/users";
import { BaseRepository } from "./base.repository";

export interface CreatorSummary {
  id: string;
  name: string;
  email: string;
}

export type ProjectRowWithCounts = typeof projects.$inferSelect & {
  hasNote: boolean;
  hasCanvas: boolean;
  creator: CreatorSummary | null;
  sharedCount: number;
};

@Injectable()
export class ProjectsRepository extends BaseRepository<typeof projects> {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db, projects);
  }

  /**
   * List active (non-archived) projects in a workspace, each annotated
   * with whether it currently has an active page / canvas, the user who
   * created it, and how many people it's been shared with. Used by the
   * workspace projects table.
   *
   * Project select + 4 small follow-up queries on the projectId set we
   * already have (pages exists, canvases exists, users join, shares
   * count). All keyed on small IN(...) sets so they stay fast.
   */
  async listByWorkspace(workspaceId: string): Promise<ProjectRowWithCounts[]> {
    const projectRows = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.archivedAt)))
      .orderBy(desc(projects.updatedAt));

    if (projectRows.length === 0) return [];

    const projectIds = projectRows.map((p) => p.id);
    const creatorIds = Array.from(
      new Set(projectRows.map((p) => p.createdByUserId).filter((v): v is string => Boolean(v))),
    );

    const [pageRows, canvasRows, creatorRows, shareRows] = await Promise.all([
      this.db
        .select({ projectId: pages.projectId })
        .from(pages)
        .where(and(inArray(pages.projectId, projectIds), isNull(pages.deletedAt))),
      this.db
        .select({ projectId: canvases.projectId })
        .from(canvases)
        .where(and(inArray(canvases.projectId, projectIds), isNull(canvases.deletedAt))),
      creatorIds.length > 0
        ? this.db
            .select({ id: users.id, name: users.name, email: users.email })
            .from(users)
            .where(inArray(users.id, creatorIds))
        : Promise.resolve([] as { id: string; name: string; email: string }[]),
      this.db
        .select({
          resourceId: resourceShares.resourceId,
          count: sql<number>`count(*)::int`,
        })
        .from(resourceShares)
        .where(
          and(
            eq(resourceShares.resourceKind, "project"),
            inArray(resourceShares.resourceId, projectIds),
            eq(resourceShares.status, "active"),
          ),
        )
        .groupBy(resourceShares.resourceId),
    ]);

    const hasNoteSet = new Set(pageRows.map((r) => r.projectId));
    const hasCanvasSet = new Set(canvasRows.map((r) => r.projectId));
    const creatorById = new Map(creatorRows.map((r) => [r.id, r]));
    const sharedById = new Map(shareRows.map((r) => [r.resourceId, Number(r.count)]));

    return projectRows.map((row) => ({
      ...row,
      hasNote: hasNoteSet.has(row.id),
      hasCanvas: hasCanvasSet.has(row.id),
      creator: row.createdByUserId ? (creatorById.get(row.createdByUserId) ?? null) : null,
      sharedCount: sharedById.get(row.id) ?? 0,
    }));
  }

  async archiveById(id: string) {
    const rows = await this.db
      .update(projects)
      .set({ archivedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return rows[0] ?? null;
  }
}
