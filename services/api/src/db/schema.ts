import {
  bigint,
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { uniqueIndex } from "drizzle-orm/pg-core";
import { generateId } from "@octofocus/shared";

// =============================================================================
// Enums
// =============================================================================

export const workspaceRole = pgEnum("workspace_role", ["OWNER", "ADMIN", "MEMBER"]);
export const agentStatus = pgEnum("agent_status", ["ACTIVE", "PAUSED", "ARCHIVED"]);
export const aiRunStatus = pgEnum("ai_run_status", [
  "PENDING",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
]);
export const changeActorType = pgEnum("change_actor_type", ["USER", "AGENT"]);

// Publish + share
export const visibilityKind = pgEnum("visibility_kind", [
  "private",
  "unlisted",
  "workspace",
  "public",
]);
export const resourceKind = pgEnum("resource_kind", ["project", "page", "canvas"]);
export const sharePermission = pgEnum("share_permission", [
  "viewer",
  "commenter",
  "editor",
  "admin",
]);
export const shareStatus = pgEnum("share_status", ["active", "pending", "revoked", "expired"]);

export const canvasAssetFormat = pgEnum("canvas_asset_format", ["svg", "png"]);

// Drizzle doesn't have a first-class `bytea` helper; map it through customType.
// We send/receive Buffer instances from the api.
const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
});

// =============================================================================
// Core identity + workspace
// =============================================================================

export const users = pgTable("users", {
  // Set explicitly by the auth guard from the Supabase JWT subject (no
  // $defaultFn): id = "usr_" + jwt.sub. Keeps our user IDs in lockstep with
  // Supabase Auth while still being self-describing.
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workspaces = pgTable("workspaces", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateId("wsp")),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId("mem")),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceRole("role").default("MEMBER").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceUserUnique: unique().on(table.workspaceId, table.userId),
    userIdx: index("workspace_members_user_id_idx").on(table.userId),
  }),
);

// =============================================================================
// Project + page + canvas — with publish + settings
// =============================================================================

export const projects = pgTable(
  "projects",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId("prj")),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon"),
    publicSlug: text("public_slug").unique(),
    visibility: visibilityKind("visibility").default("private").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    lastPublishedAt: timestamp("last_published_at", { withTimezone: true }),
    settings: jsonb("settings").default(sql`'{}'::jsonb`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => ({
    workspaceIdx: index("projects_workspace_id_idx").on(table.workspaceId),
    publicSlugIdx: index("projects_public_slug_idx").on(table.publicSlug),
  }),
);

export const pages = pgTable(
  "pages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId("pag")),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    document: jsonb("document").notNull(),
    contentMd: text("content_md").default("").notNull(),
    publicSlug: text("public_slug").unique(),
    visibility: visibilityKind("visibility").default("private").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    lastPublishedAt: timestamp("last_published_at", { withTimezone: true }),
    settings: jsonb("settings").default(sql`'{}'::jsonb`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    projectIdx: index("pages_project_id_idx").on(table.projectId),
    publicSlugIdx: index("pages_public_slug_idx").on(table.publicSlug),
    // 1:1 — at most one non-deleted page per project.
    onePerProject: uniqueIndex("pages_one_per_project_idx")
      .on(table.projectId)
      .where(sql`deleted_at IS NULL`),
  }),
);

export const pageBlocks = pgTable(
  "page_blocks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId("blk")),
    pageId: text("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    content: jsonb("content").notNull(),
    position: integer("position").notNull(),
    parentBlockId: text("parent_block_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pagePositionIdx: index("page_blocks_page_id_position_idx").on(table.pageId, table.position),
    parentIdx: index("page_blocks_parent_block_id_idx").on(table.parentBlockId),
  }),
);

export const canvases = pgTable(
  "canvases",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId("cnv")),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    document: jsonb("document").notNull(),
    diagramSchema: jsonb("diagram_schema"),
    publicSlug: text("public_slug").unique(),
    visibility: visibilityKind("visibility").default("private").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    lastPublishedAt: timestamp("last_published_at", { withTimezone: true }),
    settings: jsonb("settings").default(sql`'{}'::jsonb`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    projectIdx: index("canvases_project_id_idx").on(table.projectId),
    publicSlugIdx: index("canvases_public_slug_idx").on(table.publicSlug),
    // 1:1 — at most one non-deleted canvas per project.
    onePerProject: uniqueIndex("canvases_one_per_project_idx")
      .on(table.projectId)
      .where(sql`deleted_at IS NULL`),
  }),
);

export const pageCanvasLinks = pgTable(
  "page_canvas_links",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId("pcl")),
    pageId: text("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    canvasId: text("canvas_id")
      .notNull()
      .references(() => canvases.id, { onDelete: "cascade" }),
    relationType: text("relation_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pageCanvasRelationUnique: unique().on(table.pageId, table.canvasId, table.relationType),
    canvasIdx: index("page_canvas_links_canvas_id_idx").on(table.canvasId),
  }),
);

export const canvasSnapshots = pgTable(
  "canvas_snapshots",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId("snp")),
    canvasId: text("canvas_id")
      .notNull()
      .references(() => canvases.id, { onDelete: "cascade" }),
    document: jsonb("document").notNull(),
    diagramSchema: jsonb("diagram_schema"),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    canvasIdx: index("canvas_snapshots_canvas_id_idx").on(table.canvasId),
  }),
);

export const canvasAssets = pgTable(
  "canvas_assets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId("ast")),
    canvasId: text("canvas_id")
      .notNull()
      .references(() => canvases.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id),
    publicSlug: text("public_slug").unique(),
    visibility: visibilityKind("visibility").default("public").notNull(),
    format: canvasAssetFormat("format").default("svg").notNull(),
    width: integer("width"),
    height: integer("height"),
    content: bytea("content").notNull(),
    contentType: text("content_type").default("image/svg+xml").notNull(),
    title: text("title"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => ({
    canvasIdx: index("canvas_assets_canvas_id_idx").on(table.canvasId),
    publicSlugIdx: index("canvas_assets_public_slug_idx").on(table.publicSlug),
  }),
);

// =============================================================================
// Agents + AI runs + audit
// =============================================================================

export const agents = pgTable(
  "agents",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId("agt")),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    description: text("description"),
    status: agentStatus("status").default("ACTIVE").notNull(),
    config: jsonb("config").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("agents_workspace_id_idx").on(table.workspaceId),
    creatorIdx: index("agents_created_by_user_id_idx").on(table.createdByUserId),
  }),
);

export const aiRuns = pgTable(
  "ai_runs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId("run")),
    userId: text("user_id").references(() => users.id),
    agentId: text("agent_id").references(() => agents.id),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id),
    pageId: text("page_id").references(() => pages.id),
    canvasId: text("canvas_id").references(() => canvases.id),
    action: text("action").notNull(),
    status: aiRunStatus("status").default("PENDING").notNull(),
    input: jsonb("input").notNull(),
    output: jsonb("output"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    userCreatedIdx: index("ai_runs_user_id_created_at_idx").on(table.userId, table.createdAt),
    agentCreatedIdx: index("ai_runs_agent_id_created_at_idx").on(table.agentId, table.createdAt),
    workspaceCreatedIdx: index("ai_runs_workspace_id_created_at_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    projectIdx: index("ai_runs_project_id_idx").on(table.projectId),
    pageIdx: index("ai_runs_page_id_idx").on(table.pageId),
    canvasIdx: index("ai_runs_canvas_id_idx").on(table.canvasId),
  }),
);

export const changeEvents = pgTable(
  "change_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId("evt")),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actorType: changeActorType("actor_type").notNull(),
    userId: text("user_id").references(() => users.id),
    agentId: text("agent_id").references(() => agents.id),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    patch: jsonb("patch"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceCreatedIdx: index("change_events_workspace_id_created_at_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    entityIdx: index("change_events_entity_idx").on(table.entityType, table.entityId),
    userCreatedIdx: index("change_events_user_id_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
    agentCreatedIdx: index("change_events_agent_id_created_at_idx").on(
      table.agentId,
      table.createdAt,
    ),
  }),
);

// =============================================================================
// Sharing + access control
// =============================================================================

export const resourceShares = pgTable(
  "resource_shares",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId("shr")),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    resourceKind: resourceKind("resource_kind").notNull(),
    resourceId: text("resource_id").notNull(),
    grantedToUserId: text("granted_to_user_id").references(() => users.id, { onDelete: "cascade" }),
    grantedToEmail: text("granted_to_email"),
    permission: sharePermission("permission").default("viewer").notNull(),
    status: shareStatus("status").default("active").notNull(),
    grantedByUserId: text("granted_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    note: text("note"),
  },
  (table) => ({
    subjectXor: check(
      "resource_shares_subject_xor",
      sql`(${table.grantedToUserId} IS NOT NULL AND ${table.grantedToEmail} IS NULL)
          OR (${table.grantedToUserId} IS NULL AND ${table.grantedToEmail} IS NOT NULL)`,
    ),
    statusEmail: check(
      "resource_shares_status_email",
      sql`NOT (${table.status} = 'pending' AND ${table.grantedToEmail} IS NULL)`,
    ),
    resourceIdx: index("resource_shares_resource_idx").on(table.resourceKind, table.resourceId),
    userIdx: index("resource_shares_user_idx").on(table.grantedToUserId),
    pendingEmailIdx: index("resource_shares_pending_email_idx").on(table.grantedToEmail),
  }),
);

export const shareLinks = pgTable(
  "share_links",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId("lnk")),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    resourceKind: resourceKind("resource_kind").notNull(),
    resourceId: text("resource_id").notNull(),
    token: text("token").notNull().unique(),
    permission: sharePermission("permission").default("viewer").notNull(),
    passwordHash: text("password_hash"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    maxUses: integer("max_uses"),
    useCount: bigint("use_count", { mode: "number" }).default(0).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    note: text("note"),
  },
  (table) => ({
    resourceIdx: index("share_links_resource_idx").on(table.resourceKind, table.resourceId),
    tokenIdx: index("share_links_token_idx").on(table.token),
  }),
);

export const workspaceInvites = pgTable(
  "workspace_invites",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId("win")),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: workspaceRole("role").default("MEMBER").notNull(),
    invitedByUserId: text("invited_by_user_id")
      .notNull()
      .references(() => users.id),
    status: shareStatus("status").default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => ({
    workspaceEmailUnique: unique().on(table.workspaceId, table.email),
    emailIdx: index("workspace_invites_email_idx").on(table.email),
  }),
);

export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  defaultNotesFont: text("default_notes_font").default("sans").notNull(),
  theme: text("theme").default("system").notNull(),
  sendNotificationEmails: boolean("send_notification_emails").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
