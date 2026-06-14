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

export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>;
export type AgentAction = z.infer<typeof AgentActionSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
