import type { changeEvents } from "../db/schemas/audit";

export type ChangeActorType = "USER" | "AGENT";

export interface ChangeEvent {
  id: string;
  workspaceId: string;
  actorType: ChangeActorType;
  userId: string | null;
  agentId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  before: unknown;
  after: unknown;
  patch: unknown;
  createdAt: Date;
}

export function toChangeEvent(row: typeof changeEvents.$inferSelect): ChangeEvent {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    actorType: row.actorType,
    userId: row.userId,
    agentId: row.agentId,
    entityType: row.entityType,
    entityId: row.entityId,
    action: row.action,
    before: row.before,
    after: row.after,
    patch: row.patch,
    createdAt: row.createdAt,
  };
}
