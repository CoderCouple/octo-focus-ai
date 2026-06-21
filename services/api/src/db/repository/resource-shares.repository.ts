import { Inject, Injectable } from "@nestjs/common";
import { and, eq, or } from "drizzle-orm";
import { Database, DRIZZLE } from "../database.module";
import { resourceShares } from "../schemas/sharing";
import { BaseRepository } from "./base.repository";

@Injectable()
export class ResourceSharesRepository extends BaseRepository<typeof resourceShares> {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db, resourceShares);
  }

  async listActiveAndPendingFor(resourceKind: string, resourceId: string) {
    return this.db
      .select()
      .from(resourceShares)
      .where(
        and(
          eq(resourceShares.resourceKind, resourceKind as never),
          eq(resourceShares.resourceId, resourceId),
          or(eq(resourceShares.status, "active"), eq(resourceShares.status, "pending")),
        ),
      );
  }
}
