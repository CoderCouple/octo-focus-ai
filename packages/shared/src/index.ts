import { z } from "zod";

export * from "./ids";
import { ID_PREFIXES, type IdPrefix } from "./ids";

// =============================================================================
// ID validators — one per resource, plus a generic prefixed-id checker.
// =============================================================================

const UUID_BODY = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.source;

function prefixedId<P extends IdPrefix>(prefix: P) {
  return z.string().regex(new RegExp(`^${prefix}_${UUID_BODY}$`), {
    message: `Expected ${prefix}_<uuid> id`,
  });
}

export const UserIdSchema = prefixedId(ID_PREFIXES.user);
export const WorkspaceIdSchema = prefixedId(ID_PREFIXES.workspace);
export const WorkspaceMemberIdSchema = prefixedId(ID_PREFIXES.workspaceMember);
export const ProjectIdSchema = prefixedId(ID_PREFIXES.project);
export const PageIdSchema = prefixedId(ID_PREFIXES.page);
export const PageBlockIdSchema = prefixedId(ID_PREFIXES.pageBlock);
export const CanvasIdSchema = prefixedId(ID_PREFIXES.canvas);
export const CanvasSnapshotIdSchema = prefixedId(ID_PREFIXES.canvasSnapshot);
export const PageCanvasLinkIdSchema = prefixedId(ID_PREFIXES.pageCanvasLink);
export const AgentIdSchema = prefixedId(ID_PREFIXES.agent);
export const AiRunIdSchema = prefixedId(ID_PREFIXES.aiRun);
export const ChangeEventIdSchema = prefixedId(ID_PREFIXES.changeEvent);
export const ResourceShareIdSchema = prefixedId(ID_PREFIXES.resourceShare);
export const ShareLinkIdSchema = prefixedId(ID_PREFIXES.shareLink);
export const CanvasAssetIdSchema = prefixedId(ID_PREFIXES.canvasAsset);

// =============================================================================
// Existing enums + agent config
// =============================================================================

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
  allowedProjectIds: z.array(ProjectIdSchema).optional(),
  canEditPages: z.boolean().default(true),
  canEditCanvases: z.boolean().default(true),
  requiresApproval: z.boolean().default(true),
});

export const HealthResponseSchema = z.object({
  ok: z.boolean(),
  service: z.string(),
  timestamp: z.string(),
});

// =============================================================================
// Publish / share enums
// =============================================================================

export const VisibilitySchema = z.enum(["private", "unlisted", "workspace", "public"]);
export const ResourceKindSchema = z.enum(["project", "page", "canvas"]);
export const SharePermissionSchema = z.enum(["viewer", "commenter", "editor", "admin"]);
export const ShareStatusSchema = z.enum(["active", "pending", "revoked", "expired"]);

// =============================================================================
// Per-resource settings (UI prefs in DB)
// =============================================================================

export const ProjectSettingsSchema = z
  .object({
    defaultView: z.enum(["notes", "canvas", "split"]).optional(),
  })
  .passthrough();

export const PageSettingsSchema = z
  .object({
    font: z.enum(["sans", "serif", "mono"]).optional(),
    lineWidth: z.enum(["narrow", "default", "wide"]).optional(),
  })
  .passthrough();

export const CanvasSettingsSchema = z
  .object({
    showGrid: z.boolean().optional(),
    snapToGrid: z.boolean().optional(),
    autoShape: z.boolean().optional(),
  })
  .passthrough();

// =============================================================================
// Project / page / canvas
// =============================================================================

export const ProjectCreateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  icon: z.string().max(50).optional(),
});

export const ProjectUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
  settings: ProjectSettingsSchema.optional(),
});

export const ProjectSchema = z.object({
  id: ProjectIdSchema,
  workspaceId: WorkspaceIdSchema,
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  publicSlug: z.string().nullable(),
  visibility: VisibilitySchema,
  publishedAt: z.string().nullable(),
  lastPublishedAt: z.string().nullable(),
  settings: ProjectSettingsSchema,
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
  settings: PageSettingsSchema.optional(),
});

export const PageSchema = z.object({
  id: PageIdSchema,
  projectId: ProjectIdSchema,
  title: z.string(),
  document: z.unknown(),
  contentMd: z.string(),
  publicSlug: z.string().nullable(),
  visibility: VisibilitySchema,
  publishedAt: z.string().nullable(),
  lastPublishedAt: z.string().nullable(),
  settings: PageSettingsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const CanvasCreateSchema = z.object({
  title: z.string().min(1).max(120).default("Untitled canvas"),
});

export const CanvasUpdateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  document: z.unknown().optional(),
  diagramSchema: z.unknown().nullable().optional(),
  settings: CanvasSettingsSchema.optional(),
});

export const CanvasSchema = z.object({
  id: CanvasIdSchema,
  projectId: ProjectIdSchema,
  title: z.string(),
  document: z.unknown(),
  diagramSchema: z.unknown().nullable(),
  publicSlug: z.string().nullable(),
  visibility: VisibilitySchema,
  publishedAt: z.string().nullable(),
  lastPublishedAt: z.string().nullable(),
  settings: CanvasSettingsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

// =============================================================================
// AI runs + audit
// =============================================================================

export const AiRunStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
]);

export const AiRunCreateSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  agentId: AgentIdSchema.optional(),
  projectId: ProjectIdSchema.optional(),
  pageId: PageIdSchema.optional(),
  canvasId: CanvasIdSchema.optional(),
  action: z.string().min(1).max(120),
  input: z.unknown(),
});

export const AiRunUpdateSchema = z.object({
  status: AiRunStatusSchema.optional(),
  output: z.unknown().optional(),
});

export const AiRunSchema = z.object({
  id: AiRunIdSchema,
  userId: UserIdSchema.nullable(),
  agentId: AgentIdSchema.nullable(),
  workspaceId: WorkspaceIdSchema,
  projectId: ProjectIdSchema.nullable(),
  pageId: PageIdSchema.nullable(),
  canvasId: CanvasIdSchema.nullable(),
  action: z.string(),
  status: AiRunStatusSchema,
  input: z.unknown(),
  output: z.unknown().nullable(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
});

export const ChangeActorTypeSchema = z.enum(["USER", "AGENT"]);

export const ChangeEventSchema = z.object({
  id: ChangeEventIdSchema,
  workspaceId: WorkspaceIdSchema,
  actorType: ChangeActorTypeSchema,
  userId: UserIdSchema.nullable(),
  agentId: AgentIdSchema.nullable(),
  entityType: z.string(),
  entityId: z.string(),
  action: z.string(),
  before: z.unknown().nullable(),
  after: z.unknown().nullable(),
  patch: z.unknown().nullable(),
  createdAt: z.string(),
});

// =============================================================================
// Sharing
// =============================================================================

export const PublishUpdateSchema = z.object({
  visibility: VisibilitySchema,
});

export const PublishedResourceSchema = z.object({
  resourceKind: ResourceKindSchema,
  resourceId: z.string(),
  publicSlug: z.string(),
  visibility: VisibilitySchema,
  publishedAt: z.string().nullable(),
  lastPublishedAt: z.string().nullable(),
  workspaceSlug: z.string(),
  publicUrl: z.string(),
});

export const ResourceShareCreateSchema = z
  .object({
    resourceKind: ResourceKindSchema,
    resourceId: z.string(),
    grantedToUserId: UserIdSchema.optional(),
    grantedToEmail: z.string().email().optional(),
    permission: SharePermissionSchema.default("viewer"),
    expiresAt: z.string().datetime().optional(),
    note: z.string().max(500).optional(),
  })
  .refine((v) => !!v.grantedToUserId !== !!v.grantedToEmail, {
    message: "Provide exactly one of grantedToUserId or grantedToEmail.",
  });

export const ResourceShareUpdateSchema = z.object({
  permission: SharePermissionSchema.optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

export const ResourceShareSchema = z.object({
  id: ResourceShareIdSchema,
  workspaceId: WorkspaceIdSchema,
  resourceKind: ResourceKindSchema,
  resourceId: z.string(),
  grantedToUserId: UserIdSchema.nullable(),
  grantedToEmail: z.string().nullable(),
  permission: SharePermissionSchema,
  status: ShareStatusSchema,
  grantedByUserId: UserIdSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  acceptedAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  note: z.string().nullable(),
});

export const ShareLinkCreateSchema = z.object({
  resourceKind: ResourceKindSchema,
  resourceId: z.string(),
  permission: SharePermissionSchema.default("viewer"),
  password: z.string().min(4).max(200).optional(),
  expiresAt: z.string().datetime().optional(),
  maxUses: z.number().int().positive().optional(),
  note: z.string().max(500).optional(),
});

export const ShareLinkSchema = z.object({
  id: ShareLinkIdSchema,
  workspaceId: WorkspaceIdSchema,
  resourceKind: ResourceKindSchema,
  resourceId: z.string(),
  token: z.string(),
  permission: SharePermissionSchema,
  hasPassword: z.boolean(),
  expiresAt: z.string().nullable(),
  maxUses: z.number().int().nullable(),
  useCount: z.number().int(),
  revokedAt: z.string().nullable(),
  createdByUserId: UserIdSchema,
  createdAt: z.string(),
  lastUsedAt: z.string().nullable(),
  note: z.string().nullable(),
  url: z.string(),
});

// =============================================================================
// User preferences
// =============================================================================

// =============================================================================
// Canvas exports (image assets)
// =============================================================================

export const CanvasAssetFormatSchema = z.enum(["svg", "png"]);

export const CanvasAssetCreateSchema = z.object({
  format: CanvasAssetFormatSchema.default("svg"),
  content: z.string().min(1).max(5_000_000), // base64-encoded payload, ~5MB cap
  contentType: z.string().min(1).max(120).default("image/svg+xml"),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  title: z.string().max(120).optional(),
  visibility: VisibilitySchema.default("public"),
});

export const CanvasAssetSchema = z.object({
  id: CanvasAssetIdSchema,
  canvasId: CanvasIdSchema,
  publicSlug: z.string(),
  visibility: VisibilitySchema,
  format: CanvasAssetFormatSchema,
  contentType: z.string(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  title: z.string().nullable(),
  createdAt: z.string(),
  revokedAt: z.string().nullable(),
  url: z.string(),
  markdown: z.string(),
});

export type CanvasAssetFormat = z.infer<typeof CanvasAssetFormatSchema>;
export type CanvasAssetCreate = z.infer<typeof CanvasAssetCreateSchema>;
export type CanvasAsset = z.infer<typeof CanvasAssetSchema>;

export const UserPreferenceSchema = z.object({
  userId: UserIdSchema,
  defaultNotesFont: z.enum(["sans", "serif", "mono"]),
  theme: z.enum(["system", "light", "dark"]),
  sendNotificationEmails: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const UserPreferenceUpdateSchema = z.object({
  defaultNotesFont: z.enum(["sans", "serif", "mono"]).optional(),
  theme: z.enum(["system", "light", "dark"]).optional(),
  sendNotificationEmails: z.boolean().optional(),
});

// =============================================================================
// Types
// =============================================================================

export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>;
export type AgentAction = z.infer<typeof AgentActionSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export type Visibility = z.infer<typeof VisibilitySchema>;
export type ResourceKind = z.infer<typeof ResourceKindSchema>;
export type SharePermission = z.infer<typeof SharePermissionSchema>;
export type ShareStatus = z.infer<typeof ShareStatusSchema>;

export type ProjectSettings = z.infer<typeof ProjectSettingsSchema>;
export type PageSettings = z.infer<typeof PageSettingsSchema>;
export type CanvasSettings = z.infer<typeof CanvasSettingsSchema>;

export type Project = z.infer<typeof ProjectSchema>;
export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;
export type ProjectUpdate = z.infer<typeof ProjectUpdateSchema>;

export type Page = z.infer<typeof PageSchema>;
export type PageCreate = z.infer<typeof PageCreateSchema>;
export type PageUpdate = z.infer<typeof PageUpdateSchema>;

export type Canvas = z.infer<typeof CanvasSchema>;
export type CanvasCreate = z.infer<typeof CanvasCreateSchema>;
export type CanvasUpdate = z.infer<typeof CanvasUpdateSchema>;

export type AiRunStatus = z.infer<typeof AiRunStatusSchema>;
export type AiRunCreate = z.infer<typeof AiRunCreateSchema>;
export type AiRunUpdate = z.infer<typeof AiRunUpdateSchema>;
export type AiRun = z.infer<typeof AiRunSchema>;

export type ChangeActorType = z.infer<typeof ChangeActorTypeSchema>;
export type ChangeEvent = z.infer<typeof ChangeEventSchema>;

export type PublishUpdate = z.infer<typeof PublishUpdateSchema>;
export type PublishedResource = z.infer<typeof PublishedResourceSchema>;

export type ResourceShare = z.infer<typeof ResourceShareSchema>;
export type ResourceShareCreate = z.infer<typeof ResourceShareCreateSchema>;
export type ResourceShareUpdate = z.infer<typeof ResourceShareUpdateSchema>;

export type ShareLink = z.infer<typeof ShareLinkSchema>;
export type ShareLinkCreate = z.infer<typeof ShareLinkCreateSchema>;

export type UserPreference = z.infer<typeof UserPreferenceSchema>;
export type UserPreferenceUpdate = z.infer<typeof UserPreferenceUpdateSchema>;
