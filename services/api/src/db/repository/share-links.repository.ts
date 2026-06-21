import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../database.module";
import { shareLinks } from "../schemas/sharing";
import { BaseRepository } from "./base.repository";

@Injectable()
export class ShareLinksRepository extends BaseRepository<typeof shareLinks> {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db, shareLinks);
  }

  async listActiveFor(resourceKind: string, resourceId: string) {
    return this.db
      .select()
      .from(shareLinks)
      .where(
        and(
          eq(shareLinks.resourceKind, resourceKind as never),
          eq(shareLinks.resourceId, resourceId),
          isNull(shareLinks.revokedAt),
        ),
      );
  }

  async findByToken(token: string) {
    const rows = await this.db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.token, token))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Bump the use counter + lastUsedAt for the link with this id. */
  async recordUse(id: string) {
    await this.db
      .update(shareLinks)
      .set({ useCount: sql`${shareLinks.useCount} + 1`, lastUsedAt: new Date() })
      .where(eq(shareLinks.id, id));
  }
}
