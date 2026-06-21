import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Database, DRIZZLE } from "../database.module";
import { pages } from "../schemas/pages";
import { projects } from "../schemas/projects";
import { BaseRepository } from "./base.repository";

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

  async listForWorkspace(workspaceId: string): Promise<WorkspacePageSummaryRow[]> {
    return this.db
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
      })
      .from(pages)
      .innerJoin(projects, eq(pages.projectId, projects.id))
      .where(and(eq(projects.workspaceId, workspaceId), isNull(pages.deletedAt)))
      .orderBy(desc(pages.updatedAt));
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
