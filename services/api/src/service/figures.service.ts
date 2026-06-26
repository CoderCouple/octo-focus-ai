import { Injectable } from "@nestjs/common";
import { ChangeEventsService } from "../common/change-events.service";
import { NotFound } from "../common/error/error-factory";
import {
  FiguresRepository,
  type FigureRowWithMeta,
} from "../db/repository/figures.repository";
import { toFigure, type FigureRow } from "../model/figure.model";
import { WorkspacesService } from "./workspaces.service";

export interface FigureCreateInput {
  title: string;
  description?: string | null;
  dsl: string;
}

export interface FigureUpdateInput {
  title?: string;
  description?: string | null;
  dsl?: string;
}

@Injectable()
export class FiguresService {
  constructor(
    private readonly figuresRepo: FiguresRepository,
    private readonly workspacesService: WorkspacesService,
    private readonly changeEvents: ChangeEventsService,
  ) {}

  async listForWorkspace(
    workspaceId: string,
    actorUserId: string,
  ): Promise<FigureRowWithMeta[]> {
    await this.workspacesService.requireRole(actorUserId, workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    return this.figuresRepo.listForWorkspace(workspaceId);
  }

  async getOne(id: string, actorUserId: string): Promise<FigureRow> {
    const row = await this.figuresRepo.findById(id);
    if (!row) throw NotFound("Figure not found.");
    await this.workspacesService.requireRole(actorUserId, row.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    return toFigure(row);
  }

  async create(
    workspaceId: string,
    input: FigureCreateInput,
    actorUserId: string,
  ): Promise<FigureRow> {
    await this.workspacesService.requireRole(actorUserId, workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    const row = await this.figuresRepo.insert({
      workspaceId,
      createdByUserId: actorUserId,
      title: input.title,
      description: input.description ?? null,
      dsl: input.dsl,
    });
    await this.changeEvents.record({
      workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "figure",
      entityId: row.id,
      action: "figure.create",
      after: row,
    });
    return toFigure(row);
  }

  async update(
    id: string,
    patch: FigureUpdateInput,
    actorUserId: string,
  ): Promise<FigureRow> {
    const existing = await this.figuresRepo.findById(id);
    if (!existing) throw NotFound("Figure not found.");
    await this.workspacesService.requireRole(actorUserId, existing.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    const updated = await this.figuresRepo.updateById(id, {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.dsl !== undefined ? { dsl: patch.dsl } : {}),
    });
    if (!updated) throw NotFound("Figure not found.");
    await this.changeEvents.record({
      workspaceId: existing.workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "figure",
      entityId: id,
      action: "figure.update",
      before: existing,
      after: updated,
      patch,
    });
    return toFigure(updated);
  }

  async softDelete(id: string, actorUserId: string): Promise<FigureRow> {
    const existing = await this.figuresRepo.findById(id);
    if (!existing) throw NotFound("Figure not found.");
    await this.workspacesService.requireRole(actorUserId, existing.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    const updated = await this.figuresRepo.softDeleteById(id);
    if (!updated) throw NotFound("Figure not found.");
    await this.changeEvents.record({
      workspaceId: existing.workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "figure",
      entityId: id,
      action: "figure.delete",
      before: existing,
      after: updated,
    });
    return toFigure(updated);
  }

  /**
   * Unauthenticated read for the /f/<id> public embed URL. Returns
   * the row only when visibility !== 'private' (default for saved
   * figures is `unlisted`, so anyone with the link can render the
   * diagram — same model as Components).
   */
  async getPublicById(id: string): Promise<FigureRow | null> {
    const row = await this.figuresRepo.findById(id);
    if (!row) return null;
    if (row.visibility === "private") return null;
    return toFigure(row);
  }
}
