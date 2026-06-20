import { Inject, Injectable } from "@nestjs/common";
import { Database, DRIZZLE } from "../db/database.module";
import { changeEvents } from "../db/schema";

export interface RecordChangeInput {
  workspaceId: string;
  actorType: "USER" | "AGENT";
  userId?: string | null;
  agentId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  patch?: unknown;
}

@Injectable()
export class ChangeEventsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async record(input: RecordChangeInput) {
    const [row] = await this.db
      .insert(changeEvents)
      .values({
        workspaceId: input.workspaceId,
        actorType: input.actorType,
        userId: input.userId ?? null,
        agentId: input.agentId ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        before: (input.before as never) ?? null,
        after: (input.after as never) ?? null,
        patch: (input.patch as never) ?? null,
      })
      .returning();
    return row;
  }
}
