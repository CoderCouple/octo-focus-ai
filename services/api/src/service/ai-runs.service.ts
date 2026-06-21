/**
 * AI runs — pure CRUD shim for the AI agent infrastructure. The terminal
 * status transitions (SUCCEEDED / FAILED / CANCELLED) automatically stamp
 * completedAt the first time they're set.
 */
import { Injectable } from "@nestjs/common";
import type { AiRunCreate, AiRunUpdate } from "../api/v1/request/ai-run.request";
import { NotFound } from "../common/error/error-factory";
import { AiRunsRepository } from "../db/repository/ai-runs.repository";
import { toAiRun, type AiRun } from "../model/agent.model";
import { WorkspacesService } from "./workspaces.service";

@Injectable()
export class AiRunsService {
  constructor(
    private readonly runsRepo: AiRunsRepository,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async list(workspaceId: string, limit: number, actorUserId: string): Promise<AiRun[]> {
    await this.workspacesService.requireRole(actorUserId, workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    const rows = await this.runsRepo.listByWorkspace(workspaceId, limit);
    return rows.map(toAiRun);
  }

  async getOne(id: string, actorUserId: string): Promise<AiRun> {
    const row = await this.runsRepo.findById(id);
    if (!row) throw NotFound("AI run not found.");
    await this.workspacesService.requireRole(actorUserId, row.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    return toAiRun(row);
  }

  async create(input: AiRunCreate, actorUserId: string): Promise<AiRun> {
    await this.workspacesService.requireRole(actorUserId, input.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    const row = await this.runsRepo.insert({
      workspaceId: input.workspaceId,
      userId: actorUserId,
      agentId: input.agentId ?? null,
      projectId: input.projectId ?? null,
      pageId: input.pageId ?? null,
      canvasId: input.canvasId ?? null,
      action: input.action,
      input: input.input as never,
      status: "PENDING",
    });
    return toAiRun(row);
  }

  async update(id: string, patch: AiRunUpdate, actorUserId: string): Promise<AiRun> {
    const existing = await this.runsRepo.findById(id);
    if (!existing) throw NotFound("AI run not found.");
    await this.workspacesService.requireRole(actorUserId, existing.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    const terminal =
      patch.status === "SUCCEEDED" ||
      patch.status === "FAILED" ||
      patch.status === "CANCELLED";
    const updated = await this.runsRepo.updateById(id, {
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.output !== undefined ? { output: patch.output as never } : {}),
      ...(terminal && existing.completedAt == null ? { completedAt: new Date() } : {}),
    });
    if (!updated) throw NotFound("AI run not found.");
    return toAiRun(updated);
  }
}
