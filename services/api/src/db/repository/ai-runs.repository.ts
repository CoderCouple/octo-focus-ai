import { Inject, Injectable } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { Database, DRIZZLE } from "../database.module";
import { aiRuns } from "../schemas/agents";
import { BaseRepository } from "./base.repository";

@Injectable()
export class AiRunsRepository extends BaseRepository<typeof aiRuns> {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db, aiRuns);
  }

  async listByWorkspace(workspaceId: string, limit: number) {
    return this.db
      .select()
      .from(aiRuns)
      .where(eq(aiRuns.workspaceId, workspaceId))
      .orderBy(desc(aiRuns.createdAt))
      .limit(limit);
  }
}
