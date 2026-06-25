/**
 * Page (notes) business logic.
 *
 * 1:1 invariant: a project has at most one non-deleted page. Enforced both
 * here (BadRequest with clear copy) and at the DB layer (partial unique
 * index on pages(project_id) where deleted_at is null).
 */
import { Injectable } from "@nestjs/common";
import type { PageCreate, PageUpdate } from "../api/v1/request/page.request";
import { ChangeEventsService } from "../common/change-events.service";
import { BadRequest, NotFound } from "../common/error/error-factory";
import { PagesRepository, type WorkspacePageSummaryRow } from "../db/repository/pages.repository";
import { ProjectsRepository } from "../db/repository/projects.repository";
import { toPage, type Page } from "../model/page.model";
import { WorkspacesService } from "./workspaces.service";

@Injectable()
export class PagesService {
  constructor(
    private readonly pagesRepo: PagesRepository,
    private readonly projectsRepo: ProjectsRepository,
    private readonly workspacesService: WorkspacesService,
    private readonly changeEvents: ChangeEventsService,
  ) {}

  async listByProject(projectId: string, actorUserId: string): Promise<Page[]> {
    const project = await this.projectsRepo.findById(projectId);
    if (!project) throw NotFound("Project not found.");
    await this.workspacesService.requireRole(actorUserId, project.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    const rows = await this.pagesRepo.listByProject(projectId);
    return rows.map(toPage);
  }

  async listForWorkspace(
    workspaceId: string,
    actorUserId: string,
  ): Promise<WorkspacePageSummaryRow[]> {
    await this.workspacesService.requireRole(actorUserId, workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    return this.pagesRepo.listForWorkspace(workspaceId);
  }

  async getOne(pageId: string, actorUserId: string): Promise<Page> {
    const page = await this.pagesRepo.findById(pageId);
    if (!page) throw NotFound("Page not found.");
    const project = await this.projectsRepo.findById(page.projectId);
    if (!project) throw NotFound("Project not found.");
    await this.workspacesService.requireRole(actorUserId, project.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    return toPage(page);
  }

  async create(projectId: string, input: PageCreate, actorUserId: string): Promise<Page> {
    const project = await this.projectsRepo.findById(projectId);
    if (!project) throw NotFound("Project not found.");
    await this.workspacesService.requireRole(actorUserId, project.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);

    if (await this.pagesRepo.hasActiveInProject(projectId)) {
      throw BadRequest("This project already has a note.");
    }

    const row = await this.pagesRepo.insert({
      projectId,
      createdByUserId: actorUserId,
      title: input.title,
      document: {},
    });
    await this.changeEvents.record({
      workspaceId: project.workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "page",
      entityId: row.id,
      action: "page.create",
      after: row,
    });
    return toPage(row);
  }

  async update(pageId: string, patch: PageUpdate, actorUserId: string): Promise<Page> {
    const existing = await this.pagesRepo.findById(pageId);
    if (!existing) throw NotFound("Page not found.");
    const project = await this.projectsRepo.findById(existing.projectId);
    if (!project) throw NotFound("Project not found.");
    await this.workspacesService.requireRole(actorUserId, project.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);

    const updated = await this.pagesRepo.updateById(pageId, {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.document !== undefined ? { document: patch.document as never } : {}),
      ...(patch.contentMd !== undefined ? { contentMd: patch.contentMd } : {}),
      ...(patch.settings !== undefined ? { settings: patch.settings as never } : {}),
      updatedAt: new Date(),
    });
    if (!updated) throw NotFound("Page not found.");

    await this.changeEvents.record({
      workspaceId: project.workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "page",
      entityId: pageId,
      action: "page.update",
      before: existing,
      after: updated,
      patch,
    });
    return toPage(updated);
  }

  async softDelete(pageId: string, actorUserId: string): Promise<Page> {
    const existing = await this.pagesRepo.findById(pageId);
    if (!existing) throw NotFound("Page not found.");
    const project = await this.projectsRepo.findById(existing.projectId);
    if (!project) throw NotFound("Project not found.");
    await this.workspacesService.requireRole(actorUserId, project.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    const updated = await this.pagesRepo.softDeleteById(pageId);
    if (!updated) throw NotFound("Page not found.");
    await this.changeEvents.record({
      workspaceId: project.workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "page",
      entityId: pageId,
      action: "page.delete",
      before: existing,
      after: updated,
    });
    return toPage(updated);
  }
}
