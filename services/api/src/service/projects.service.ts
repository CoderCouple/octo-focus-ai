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
import { CanvasesRepository } from "../db/repository/canvases.repository";
import { PagesRepository } from "../db/repository/pages.repository";
import { ProjectsRepository } from "../db/repository/projects.repository";
import { toProject, type Project } from "../model/project.model";
import {
  expectedChildTitle,
  isAutoTitle,
  type ProjectChildRole,
} from "./lib/project-child-naming";
import { WorkspacesService } from "./workspaces.service";

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepo: ProjectsRepository,
    private readonly pagesRepo: PagesRepository,
    private readonly canvasesRepo: CanvasesRepository,
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

    // Cascade rename: when the project name actually changes, re-derive
    // the title of each 1:1 child (page + canvas) only when their current
    // title still matches the OLD expected pattern. Manual overrides
    // stay sticky.
    const nameChanged = patch.name !== undefined && patch.name !== existing.name;
    if (nameChanged) {
      await this.cascadeRename(
        projectId,
        existing.workspaceId,
        existing.name,
        patch.name!,
        actorUserId,
      );
    }

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

  /**
   * Re-title the project's 1:1 page + canvas children to reflect the
   * new project name — but only the ones still using the auto-derived
   * title for the OLD name. Children the user has hand-edited keep
   * their custom title.
   *
   * Failures here log and continue: a rename succeeding on the
   * project row but failing on one child is recoverable (the user
   * can re-rename to retry); a noisy throw isn't.
   */
  private async cascadeRename(
    projectId: string,
    workspaceId: string,
    oldName: string,
    newName: string,
    actorUserId: string,
  ): Promise<void> {
    const roleConfigs: Array<{
      role: ProjectChildRole;
      list: () => Promise<Array<{ id: string; title: string }>>;
      update: (id: string, patch: { title: string; updatedAt: Date }) => Promise<unknown>;
      entityType: "page" | "canvas";
    }> = [
      {
        role: "Note",
        list: () => this.pagesRepo.listByProject(projectId),
        update: (id, patch) => this.pagesRepo.updateById(id, patch),
        entityType: "page",
      },
      {
        role: "Canvas",
        list: () => this.canvasesRepo.listByProject(projectId),
        update: (id, patch) => this.canvasesRepo.updateById(id, patch),
        entityType: "canvas",
      },
    ];

    for (const cfg of roleConfigs) {
      const children = await cfg.list();
      for (const child of children) {
        if (!isAutoTitle(child.title, oldName, cfg.role)) continue;
        const nextTitle = expectedChildTitle(newName, cfg.role);
        try {
          await cfg.update(child.id, { title: nextTitle, updatedAt: new Date() });
          await this.changeEvents.record({
            workspaceId,
            actorType: "USER",
            userId: actorUserId,
            entityType: cfg.entityType,
            entityId: child.id,
            action: `${cfg.entityType}.update`,
            before: { title: child.title },
            after: { title: nextTitle },
            patch: { title: nextTitle },
            // Why: this rename was triggered by the parent project
            // changing names, not a direct edit on the child.
            cascadedFrom: { kind: "project", id: projectId },
          } as never);
        } catch (err) {
          console.error("cascadeRename child update failed", err);
        }
      }
    }
  }

  /**
   * Soft archive — preserves rows under FK constraints, and cascades
   * the soft-delete to every active page + canvas under the project.
   * Projects are containers in the UX; orphaning children when the
   * container archives leaves them dangling in their list views.
   */
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

    await this.cascadeDelete(projectId, existing.workspaceId, actorUserId);

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

  /**
   * Soft-delete every active page + canvas under the project. Each
   * deletion emits its own `change_event` so audit + undo tooling can
   * see the cascade. A child failure logs and continues — partial
   * progress is better than throwing mid-iteration.
   */
  private async cascadeDelete(
    projectId: string,
    workspaceId: string,
    actorUserId: string,
  ): Promise<void> {
    const [pages, canvases] = await Promise.all([
      this.pagesRepo.listByProject(projectId),
      this.canvasesRepo.listByProject(projectId),
    ]);

    for (const page of pages) {
      try {
        const after = await this.pagesRepo.softDeleteById(page.id);
        if (!after) continue;
        await this.changeEvents.record({
          workspaceId,
          actorType: "USER",
          userId: actorUserId,
          entityType: "page",
          entityId: page.id,
          action: "page.delete",
          before: page,
          after,
          cascadedFrom: { kind: "project", id: projectId },
        } as never);
      } catch (err) {
        console.error("cascadeDelete page failed", err);
      }
    }

    for (const canvas of canvases) {
      try {
        const after = await this.canvasesRepo.softDeleteById(canvas.id);
        if (!after) continue;
        await this.changeEvents.record({
          workspaceId,
          actorType: "USER",
          userId: actorUserId,
          entityType: "canvas",
          entityId: canvas.id,
          action: "canvas.delete",
          before: canvas,
          after,
          cascadedFrom: { kind: "project", id: projectId },
        } as never);
      } catch (err) {
        console.error("cascadeDelete canvas failed", err);
      }
    }
  }
}
