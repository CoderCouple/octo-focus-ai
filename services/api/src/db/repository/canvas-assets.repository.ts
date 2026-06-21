import { Inject, Injectable } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { Database, DRIZZLE } from "../database.module";
import { canvasAssets } from "../schemas/canvases";
import { BaseRepository } from "./base.repository";

@Injectable()
export class CanvasAssetsRepository extends BaseRepository<typeof canvasAssets> {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db, canvasAssets);
  }

  async listByCanvas(canvasId: string) {
    return this.db
      .select()
      .from(canvasAssets)
      .where(eq(canvasAssets.canvasId, canvasId))
      .orderBy(desc(canvasAssets.createdAt));
  }

  async findByPublicSlug(slug: string) {
    const rows = await this.db
      .select()
      .from(canvasAssets)
      .where(eq(canvasAssets.publicSlug, slug))
      .limit(1);
    return rows[0] ?? null;
  }

  async revokeById(id: string) {
    const rows = await this.db
      .update(canvasAssets)
      .set({ revokedAt: new Date() })
      .where(eq(canvasAssets.id, id))
      .returning();
    return rows[0] ?? null;
  }
}
