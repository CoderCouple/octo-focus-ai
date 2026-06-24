import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { Database, DRIZZLE } from "../database.module";
import { canvases } from "../schemas/canvases";
import { pages } from "../schemas/pages";
import { projects } from "../schemas/projects";
import { BaseRepository } from "./base.repository";

export type ProjectRowWithCounts = typeof projects.$inferSelect & {
  hasNote: boolean;
  hasCanvas: boolean;
};

@Injectable()
export class ProjectsRepository extends BaseRepository<typeof projects> {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db, projects);
  }

  /**
   * List active (non-archived) projects in a workspace, each annotated
   * with whether it currently has an active (non-deleted) page and/or
   * canvas. Used by the workspace home so cards render accurate "Notes"
   * / "Canvas" chips per project.
   *
   * Two extra round-trips on top of the project select, both keyed on
   * the small `projectId IN (...)` set we just fetched. Comfortably
   * under 50ms even with hundreds of projects per workspace.
   */
  async listByWorkspace(workspaceId: string): Promise<ProjectRowWithCounts[]> {
    const projectRows = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.archivedAt)))
      .orderBy(desc(projects.updatedAt));

    if (projectRows.length === 0) return [];

    const projectIds = projectRows.map((p) => p.id);
    const [pageRows, canvasRows] = await Promise.all([
      this.db
        .select({ projectId: pages.projectId })
        .from(pages)
        .where(and(inArray(pages.projectId, projectIds), isNull(pages.deletedAt))),
      this.db
        .select({ projectId: canvases.projectId })
        .from(canvases)
        .where(and(inArray(canvases.projectId, projectIds), isNull(canvases.deletedAt))),
    ]);

    const hasNoteSet = new Set(pageRows.map((r) => r.projectId));
    const hasCanvasSet = new Set(canvasRows.map((r) => r.projectId));

    return projectRows.map((row) => ({
      ...row,
      hasNote: hasNoteSet.has(row.id),
      hasCanvas: hasCanvasSet.has(row.id),
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
