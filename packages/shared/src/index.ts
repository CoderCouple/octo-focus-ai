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

export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>;
export type AgentAction = z.infer<typeof AgentActionSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;
export type ProjectUpdate = z.infer<typeof ProjectUpdateSchema>;
