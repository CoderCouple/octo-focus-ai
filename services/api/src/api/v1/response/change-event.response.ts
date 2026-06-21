import type { ChangeActorType, ChangeEvent } from "../../../model/change-event.model";

export interface ChangeEventDto {
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
  createdAt: string;
}

export function changeEventToDto(event: ChangeEvent): ChangeEventDto {
  return {
    id: event.id,
    workspaceId: event.workspaceId,
    actorType: event.actorType,
    userId: event.userId,
    agentId: event.agentId,
    entityType: event.entityType,
    entityId: event.entityId,
    action: event.action,
    before: event.before,
    after: event.after,
    patch: event.patch,
    createdAt: event.createdAt.toISOString(),
  };
}
