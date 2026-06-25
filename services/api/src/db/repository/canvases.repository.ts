import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../database.module";
import { canvases } from "../schemas/canvases";
import { projects } from "../schemas/projects";
import { resourceShares } from "../schemas/sharing";
import { users } from "../schemas/users";
import { BaseRepository } from "./base.repository";

export interface CanvasCreatorSummary {
  id: string;
  name: string;
  email: string;
}

export interface WorkspaceCanvasSummaryRow {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  publicSlug: string | null;
  visibility: string;
  createdAt: Date;
  updatedAt: Date;
  creator: CanvasCreatorSummary | null;
  sharedCount: number;
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
    const rows = await this.db
      .select({
        id: canvases.id,
        title: canvases.title,
        projectId: canvases.projectId,
        projectName: projects.name,
        publicSlug: canvases.publicSlug,
        visibility: canvases.visibility,
        createdAt: canvases.createdAt,
        updatedAt: canvases.updatedAt,
        createdByUserId: canvases.createdByUserId,
        creatorId: users.id,
        creatorName: users.name,
        creatorEmail: users.email,
      })
      .from(canvases)
      .innerJoin(projects, eq(canvases.projectId, projects.id))
      .leftJoin(users, eq(canvases.createdByUserId, users.id))
      .where(and(eq(projects.workspaceId, workspaceId), isNull(canvases.deletedAt)))
      .orderBy(desc(canvases.updatedAt));

    if (rows.length === 0) return [];

    const canvasIds = rows.map((r) => r.id);
    const shareRows = await this.db
      .select({
        resourceId: resourceShares.resourceId,
        count: sql<number>`count(*)::int`,
      })
      .from(resourceShares)
      .where(
        and(
          eq(resourceShares.resourceKind, "canvas"),
          inArray(resourceShares.resourceId, canvasIds),
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
      publicSlug: r.publicSlug,
      visibility: r.visibility,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      creator:
        r.creatorId && r.creatorName && r.creatorEmail
          ? { id: r.creatorId, name: r.creatorName, email: r.creatorEmail }
          : null,
      sharedCount: sharedById.get(r.id) ?? 0,
    }));
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
