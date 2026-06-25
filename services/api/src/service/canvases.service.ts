import { Injectable } from "@nestjs/common";
import type { CanvasCreate, CanvasUpdate } from "../api/v1/request/canvas.request";
import { ChangeEventsService } from "../common/change-events.service";
import { BadRequest, NotFound } from "../common/error/error-factory";
import { CanvasesRepository, type WorkspaceCanvasSummaryRow } from "../db/repository/canvases.repository";
import { ProjectsRepository } from "../db/repository/projects.repository";
import { toCanvas, type Canvas } from "../model/canvas.model";
import { WorkspacesService } from "./workspaces.service";

@Injectable()
export class CanvasesService {
  constructor(
    private readonly canvasesRepo: CanvasesRepository,
    private readonly projectsRepo: ProjectsRepository,
    private readonly workspacesService: WorkspacesService,
    private readonly changeEvents: ChangeEventsService,
  ) {}

  async listByProject(projectId: string, actorUserId: string): Promise<Canvas[]> {
    const project = await this.projectsRepo.findById(projectId);
    if (!project) throw NotFound("Project not found.");
    await this.workspacesService.requireRole(actorUserId, project.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    const rows = await this.canvasesRepo.listByProject(projectId);
    return rows.map(toCanvas);
  }

  async listForWorkspace(
    workspaceId: string,
    actorUserId: string,
  ): Promise<WorkspaceCanvasSummaryRow[]> {
    await this.workspacesService.requireRole(actorUserId, workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    return this.canvasesRepo.listForWorkspace(workspaceId);
  }

  async getOne(canvasId: string, actorUserId: string): Promise<Canvas> {
    const canvas = await this.canvasesRepo.findById(canvasId);
    if (!canvas) throw NotFound("Canvas not found.");
    const project = await this.projectsRepo.findById(canvas.projectId);
    if (!project) throw NotFound("Project not found.");
    await this.workspacesService.requireRole(actorUserId, project.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    return toCanvas(canvas);
  }

  async create(
    projectId: string,
    input: CanvasCreate,
    actorUserId: string,
  ): Promise<Canvas> {
    const project = await this.projectsRepo.findById(projectId);
    if (!project) throw NotFound("Project not found.");
    await this.workspacesService.requireRole(actorUserId, project.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    if (await this.canvasesRepo.hasActiveInProject(projectId)) {
      throw BadRequest("This project already has a canvas.");
    }
    const row = await this.canvasesRepo.insert({
      projectId,
      createdByUserId: actorUserId,
      title: input.title,
      document: {},
    });
    await this.changeEvents.record({
      workspaceId: project.workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "canvas",
      entityId: row.id,
      action: "canvas.create",
      after: row,
    });
    return toCanvas(row);
  }

  async update(
    canvasId: string,
    patch: CanvasUpdate,
    actorUserId: string,
  ): Promise<Canvas> {
    const existing = await this.canvasesRepo.findById(canvasId);
    if (!existing) throw NotFound("Canvas not found.");
    const project = await this.projectsRepo.findById(existing.projectId);
    if (!project) throw NotFound("Project not found.");
    await this.workspacesService.requireRole(actorUserId, project.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    const updated = await this.canvasesRepo.updateById(canvasId, {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.document !== undefined ? { document: patch.document as never } : {}),
      ...(patch.diagramSchema !== undefined
        ? { diagramSchema: patch.diagramSchema as never }
        : {}),
      ...(patch.settings !== undefined ? { settings: patch.settings as never } : {}),
      updatedAt: new Date(),
    });
    if (!updated) throw NotFound("Canvas not found.");
    await this.changeEvents.record({
      workspaceId: project.workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "canvas",
      entityId: canvasId,
      action: "canvas.update",
      before: existing,
      after: updated,
      patch,
    });
    return toCanvas(updated);
  }

  async softDelete(canvasId: string, actorUserId: string): Promise<Canvas> {
    const existing = await this.canvasesRepo.findById(canvasId);
    if (!existing) throw NotFound("Canvas not found.");
    const project = await this.projectsRepo.findById(existing.projectId);
    if (!project) throw NotFound("Project not found.");
    await this.workspacesService.requireRole(actorUserId, project.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    const updated = await this.canvasesRepo.softDeleteById(canvasId);
    if (!updated) throw NotFound("Canvas not found.");
    await this.changeEvents.record({
      workspaceId: project.workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "canvas",
      entityId: canvasId,
      action: "canvas.delete",
      before: existing,
      after: updated,
    });
    return toCanvas(updated);
  }
}
