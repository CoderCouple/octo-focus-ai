/**
 * Project business logic. All gates run through WorkspacesService.requireRole
 * so we share one membership check across features.
 *
 * Note: the public DELETE endpoint is an archive (sets archivedAt), not a
 * hard delete. The original controller did this and we preserve the semantics.
 */
import { Injectable } from "@nestjs/common";
import type {
  ProjectCreate,
  ProjectUpdate,
} from "../api/v1/request/project.request";
import { ChangeEventsService } from "../common/change-events.service";
import { NotFound } from "../common/error/error-factory";
import { ProjectsRepository } from "../db/repository/projects.repository";
import { toProject, type Project } from "../model/project.model";
import { WorkspacesService } from "./workspaces.service";

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepo: ProjectsRepository,
    private readonly workspacesService: WorkspacesService,
    private readonly changeEvents: ChangeEventsService,
  ) {}

  async listForWorkspace(workspaceId: string, actorUserId: string): Promise<Project[]> {
    await this.workspacesService.requireRole(actorUserId, workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    const rows = await this.projectsRepo.listByWorkspace(workspaceId);
    return rows.map(toProject);
  }

  async getOne(projectId: string, actorUserId: string): Promise<Project> {
    const project = await this.projectsRepo.findById(projectId);
    if (!project) throw NotFound("Project not found.");
    await this.workspacesService.requireRole(actorUserId, project.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    return toProject(project);
  }

  async create(
    workspaceId: string,
    input: ProjectCreate,
    actorUserId: string,
  ): Promise<Project> {
    await this.workspacesService.requireRole(actorUserId, workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    const row = await this.projectsRepo.insert({
      workspaceId,
      createdByUserId: actorUserId,
      name: input.name,
      description: input.description ?? null,
      icon: input.icon ?? null,
    });
    await this.changeEvents.record({
      workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "project",
      entityId: row.id,
      action: "project.create",
      after: row,
    });
    return toProject(row);
  }

  async update(
    projectId: string,
    patch: ProjectUpdate,
    actorUserId: string,
  ): Promise<Project> {
    const existing = await this.projectsRepo.findById(projectId);
    if (!existing) throw NotFound("Project not found.");
    await this.workspacesService.requireRole(actorUserId, existing.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);

    const updated = await this.projectsRepo.updateById(projectId, {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
      updatedAt: new Date(),
    });
    if (!updated) throw NotFound("Project not found.");

    await this.changeEvents.record({
      workspaceId: existing.workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "project",
      entityId: projectId,
      action: "project.update",
      before: existing,
      after: updated,
      patch,
    });
    return toProject(updated);
  }

  /** Soft archive — preserves rows under FK constraints. */
  async archive(projectId: string, actorUserId: string): Promise<Project> {
    const existing = await this.projectsRepo.findById(projectId);
    if (!existing) throw NotFound("Project not found.");
    await this.workspacesService.requireRole(actorUserId, existing.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    const updated = await this.projectsRepo.archiveById(projectId);
    if (!updated) throw NotFound("Project not found.");
    await this.changeEvents.record({
      workspaceId: existing.workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "project",
      entityId: projectId,
      action: "project.archive",
      before: existing,
      after: updated,
    });
    return toProject(updated);
  }
}
