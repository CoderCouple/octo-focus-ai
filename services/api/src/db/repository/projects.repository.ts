import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Database, DRIZZLE } from "../database.module";
import { projects } from "../schemas/projects";
import { BaseRepository } from "./base.repository";

@Injectable()
export class ProjectsRepository extends BaseRepository<typeof projects> {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db, projects);
  }

  async listByWorkspace(workspaceId: string) {
    return this.db
      .select()
      .from(projects)
      .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.archivedAt)))
      .orderBy(desc(projects.updatedAt));
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
