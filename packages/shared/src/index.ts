import { z } from "zod";

export const WorkspaceRoleSchema = z.enum(["OWNER", "ADMIN", "MEMBER"]);

export const AgentActionSchema = z.enum([
  "page.create",
  "page.update",
  "canvas.create",
  "canvas.update",
  "diagram.generate",
  "diagram.layout",
  "diagram.explain",
]);

export const AgentConfigSchema = z.object({
  model: z.string().default("gpt-4.1-mini"),
  instructions: z.string(),
  allowedActions: z.array(AgentActionSchema),
  allowedProjectIds: z.array(z.string().uuid()).optional(),
  canEditPages: z.boolean().default(true),
  canEditCanvases: z.boolean().default(true),
  requiresApproval: z.boolean().default(true),
});

export const HealthResponseSchema = z.object({
  ok: z.boolean(),
  service: z.string(),
  timestamp: z.string(),
});

export const ProjectCreateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  icon: z.string().max(50).optional(),
});

export const ProjectUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
});

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: z.string().nullable(),
});

export const PageCreateSchema = z.object({
  title: z.string().min(1).max(120).default("Untitled"),
});

export const PageUpdateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  document: z.unknown().optional(),
  contentMd: z.string().optional(),
});

export const PageSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string(),
  document: z.unknown(),
  contentMd: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const AiRunStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
]);

export const AiRunCreateSchema = z.object({
  workspaceId: z.string().uuid(),
  agentId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  pageId: z.string().uuid().optional(),
  canvasId: z.string().uuid().optional(),
  action: z.string().min(1).max(120),
  input: z.unknown(),
});

export const AiRunUpdateSchema = z.object({
  status: AiRunStatusSchema.optional(),
  output: z.unknown().optional(),
});

export const AiRunSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  agentId: z.string().uuid().nullable(),
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
  pageId: z.string().uuid().nullable(),
  canvasId: z.string().uuid().nullable(),
  action: z.string(),
  status: AiRunStatusSchema,
  input: z.unknown(),
  output: z.unknown().nullable(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
});

export const ChangeActorTypeSchema = z.enum(["USER", "AGENT"]);

export const ChangeEventSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  actorType: ChangeActorTypeSchema,
  userId: z.string().uuid().nullable(),
  agentId: z.string().uuid().nullable(),
  entityType: z.string(),
  entityId: z.string().uuid(),
  action: z.string(),
  before: z.unknown().nullable(),
  after: z.unknown().nullable(),
  patch: z.unknown().nullable(),
  createdAt: z.string(),
});

export const CanvasCreateSchema = z.object({
  title: z.string().min(1).max(120).default("Untitled canvas"),
});

export const CanvasUpdateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  document: z.unknown().optional(),
  diagramSchema: z.unknown().nullable().optional(),
});

export const CanvasSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string(),
  document: z.unknown(),
  diagramSchema: z.unknown().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>;
export type AgentAction = z.infer<typeof AgentActionSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;
export type ProjectUpdate = z.infer<typeof ProjectUpdateSchema>;
export type Canvas = z.infer<typeof CanvasSchema>;
export type CanvasCreate = z.infer<typeof CanvasCreateSchema>;
export type CanvasUpdate = z.infer<typeof CanvasUpdateSchema>;
export type Page = z.infer<typeof PageSchema>;
export type PageCreate = z.infer<typeof PageCreateSchema>;
export type PageUpdate = z.infer<typeof PageUpdateSchema>;
export type AiRunStatus = z.infer<typeof AiRunStatusSchema>;
export type AiRunCreate = z.infer<typeof AiRunCreateSchema>;
export type AiRunUpdate = z.infer<typeof AiRunUpdateSchema>;
export type AiRun = z.infer<typeof AiRunSchema>;
export type ChangeActorType = z.infer<typeof ChangeActorTypeSchema>;
export type ChangeEvent = z.infer<typeof ChangeEventSchema>;
