import { Injectable } from "@nestjs/common";
import { ChangeEventsService } from "../common/change-events.service";
import { NotFound } from "../common/error/error-factory";
import {
  ComponentsRepository,
  type ComponentRowWithMeta,
} from "../db/repository/components.repository";
import { toComponent, type ComponentLanguage, type ComponentRow } from "../model/component.model";
import { WorkspacesService } from "./workspaces.service";

export interface ComponentCreateInput {
  title: string;
  description?: string | null;
  code: string;
  language: ComponentLanguage;
}

export interface ComponentUpdateInput {
  title?: string;
  description?: string | null;
  code?: string;
  language?: ComponentLanguage;
}

@Injectable()
export class ComponentsService {
  constructor(
    private readonly componentsRepo: ComponentsRepository,
    private readonly workspacesService: WorkspacesService,
    private readonly changeEvents: ChangeEventsService,
  ) {}

  async listForWorkspace(
    workspaceId: string,
    actorUserId: string,
  ): Promise<ComponentRowWithMeta[]> {
    await this.workspacesService.requireRole(actorUserId, workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    return this.componentsRepo.listForWorkspace(workspaceId);
  }

  async getOne(id: string, actorUserId: string): Promise<ComponentRow> {
    const row = await this.componentsRepo.findById(id);
    if (!row) throw NotFound("Component not found.");
    await this.workspacesService.requireRole(actorUserId, row.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    return toComponent(row);
  }

  async create(
    workspaceId: string,
    input: ComponentCreateInput,
    actorUserId: string,
  ): Promise<ComponentRow> {
    await this.workspacesService.requireRole(actorUserId, workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    const row = await this.componentsRepo.insert({
      workspaceId,
      createdByUserId: actorUserId,
      title: input.title,
      description: input.description ?? null,
      code: input.code,
      language: input.language,
    });
    await this.changeEvents.record({
      workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "component",
      entityId: row.id,
      action: "component.create",
      after: row,
    });
    return toComponent(row);
  }

  async update(
    id: string,
    patch: ComponentUpdateInput,
    actorUserId: string,
  ): Promise<ComponentRow> {
    const existing = await this.componentsRepo.findById(id);
    if (!existing) throw NotFound("Component not found.");
    await this.workspacesService.requireRole(actorUserId, existing.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    const updated = await this.componentsRepo.updateById(id, {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.code !== undefined ? { code: patch.code } : {}),
      ...(patch.language !== undefined ? { language: patch.language } : {}),
    });
    if (!updated) throw NotFound("Component not found.");
    await this.changeEvents.record({
      workspaceId: existing.workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "component",
      entityId: id,
      action: "component.update",
      before: existing,
      after: updated,
      patch,
    });
    return toComponent(updated);
  }

  async softDelete(id: string, actorUserId: string): Promise<ComponentRow> {
    const existing = await this.componentsRepo.findById(id);
    if (!existing) throw NotFound("Component not found.");
    await this.workspacesService.requireRole(actorUserId, existing.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    const updated = await this.componentsRepo.softDeleteById(id);
    if (!updated) throw NotFound("Component not found.");
    await this.changeEvents.record({
      workspaceId: existing.workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "component",
      entityId: id,
      action: "component.delete",
      before: existing,
      after: updated,
    });
    return toComponent(updated);
  }

  /**
   * Unauthenticated read for the /c/<id> public embed URL. Returns
   * the row only when visibility !== 'private' (default for saved
   * components is `unlisted`, so anyone with the link renders the
   * artifact — same model as Loom embeds).
   */
  async getPublicById(id: string): Promise<ComponentRow | null> {
    const row = await this.componentsRepo.findById(id);
    if (!row) return null;
    if (row.visibility === "private") return null;
    return toComponent(row);
  }
}
