import type { agents, aiRuns } from "../db/schemas/agents";

export type AgentStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";
export type AiRunStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

export interface Agent {
  id: string;
  workspaceId: string;
  createdByUserId: string;
  name: string;
  description: string | null;
  status: AgentStatus;
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface AiRun {
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
  createdAt: Date;
  completedAt: Date | null;
}

export function toAgent(row: typeof agents.$inferSelect): Agent {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    createdByUserId: row.createdByUserId,
    name: row.name,
    description: row.description,
    status: row.status,
    config: row.config,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toAiRun(row: typeof aiRuns.$inferSelect): AiRun {
  return {
    id: row.id,
    userId: row.userId,
    agentId: row.agentId,
    workspaceId: row.workspaceId,
    projectId: row.projectId,
    pageId: row.pageId,
    canvasId: row.canvasId,
    action: row.action,
    status: row.status,
    input: row.input,
    output: row.output,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
  };
}
