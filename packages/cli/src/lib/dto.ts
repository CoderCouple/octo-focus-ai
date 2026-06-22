/**
 * Wire DTOs the api emits. Mirror of services/api/src/response/*.
 * Kept narrow on purpose — only the fields the CLI actually reads.
 */

export interface UserDto {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface WorkspaceDto {
  id: string;
  name: string;
  slug: string;
}

export interface MembershipPairDto {
  membership: { id: string; workspaceId: string; userId: string; role: string };
  workspace: WorkspaceDto;
}

export interface MeDto {
  user: UserDto;
  memberships: MembershipPairDto[];
}

export interface ProjectDto {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  visibility: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface PageDto {
  id: string;
  projectId: string;
  title: string;
  contentMd: string;
  visibility: string;
  publicSlug: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface WorkspacePageSummaryDto {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  contentMd: string;
  visibility: string;
  publicSlug: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasDto {
  id: string;
  projectId: string;
  title: string;
  document: unknown;
  diagramSchema: { dsl?: string } & Record<string, unknown> | null;
  visibility: string;
  publicSlug: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface WorkspaceCanvasSummaryDto {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  visibility: string;
  publicSlug: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AiRunStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

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
