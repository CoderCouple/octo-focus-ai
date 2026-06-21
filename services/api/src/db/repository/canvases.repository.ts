import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Database, DRIZZLE } from "../database.module";
import { canvases } from "../schemas/canvases";
import { projects } from "../schemas/projects";
import { BaseRepository } from "./base.repository";

export interface WorkspaceCanvasSummaryRow {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  publicSlug: string | null;
  visibility: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CanvasesRepository extends BaseRepository<typeof canvases> {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db, canvases);
  }

  async listByProject(projectId: string) {
    return this.db
      .select()
      .from(canvases)
      .where(and(eq(canvases.projectId, projectId), isNull(canvases.deletedAt)))
      .orderBy(desc(canvases.updatedAt));
  }

  async listForWorkspace(workspaceId: string): Promise<WorkspaceCanvasSummaryRow[]> {
    return this.db
      .select({
        id: canvases.id,
        title: canvases.title,
        projectId: canvases.projectId,
        projectName: projects.name,
        publicSlug: canvases.publicSlug,
        visibility: canvases.visibility,
        createdAt: canvases.createdAt,
        updatedAt: canvases.updatedAt,
      })
      .from(canvases)
      .innerJoin(projects, eq(canvases.projectId, projects.id))
      .where(and(eq(projects.workspaceId, workspaceId), isNull(canvases.deletedAt)))
      .orderBy(desc(canvases.updatedAt));
  }

  async hasActiveInProject(projectId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: canvases.id })
      .from(canvases)
      .where(and(eq(canvases.projectId, projectId), isNull(canvases.deletedAt)))
      .limit(1);
    return rows.length > 0;
  }

  async softDeleteById(id: string) {
    const rows = await this.db
      .update(canvases)
      .set({ deletedAt: new Date() })
      .where(eq(canvases.id, id))
      .returning();
    return rows[0] ?? null;
  }
}
