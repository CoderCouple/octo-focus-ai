import type { AiRun, AiRunStatus } from "../../../model/agent.model";

export interface AiRunDto {
  id: string;
  userId: string | null;
  agentId: string | null;
  workspaceId: string;
  projectId: string | null;
  pageId: string | null;
  canvasId: string | null;
  action: string;
  status: AiRunStatus;
  input: unknown;
  output: unknown;
  createdAt: string;
  completedAt: string | null;
}

export function aiRunToDto(run: AiRun): AiRunDto {
  return {
    id: run.id,
    userId: run.userId,
    agentId: run.agentId,
    workspaceId: run.workspaceId,
    projectId: run.projectId,
    pageId: run.pageId,
    canvasId: run.canvasId,
    action: run.action,
    status: run.status,
    input: run.input,
    output: run.output,
    createdAt: run.createdAt.toISOString(),
    completedAt: run.completedAt ? run.completedAt.toISOString() : null,
  };
}
