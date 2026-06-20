import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

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

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
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

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => ({
    workspaceIdx: index("projects_workspace_id_idx").on(table.workspaceId),
  }),
);

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    document: jsonb("document").notNull(),
    contentMd: text("content_md").default("").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    projectIdx: index("pages_project_id_idx").on(table.projectId),
  }),
);

export const pageBlocks = pgTable(
  "page_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    content: jsonb("content").notNull(),
    position: integer("position").notNull(),
    parentBlockId: uuid("parent_block_id"),
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
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    document: jsonb("document").notNull(),
    diagramSchema: jsonb("diagram_schema"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    projectIdx: index("canvases_project_id_idx").on(table.projectId),
  }),
);

export const pageCanvasLinks = pgTable(
  "page_canvas_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    canvasId: uuid("canvas_id")
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
    id: uuid("id").defaultRandom().primaryKey(),
    canvasId: uuid("canvas_id")
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

export const agents = pgTable(
  "agents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id")
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
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id),
    agentId: uuid("agent_id").references(() => agents.id),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id),
    pageId: uuid("page_id").references(() => pages.id),
    canvasId: uuid("canvas_id").references(() => canvases.id),
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
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actorType: changeActorType("actor_type").notNull(),
    userId: uuid("user_id").references(() => users.id),
    agentId: uuid("agent_id").references(() => agents.id),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
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
