import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { generateId } from "@octofocus/shared";
import { agentStatus, aiRunStatus } from "./enums";
import { canvases } from "./canvases";
import { pages } from "./pages";
import { projects } from "./projects";
import { users } from "./users";
import { workspaces } from "./workspaces";

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
