import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { generateId } from "@octofocus/shared";
import { changeActorType } from "./enums";
import { agents } from "./agents";
import { users } from "./users";
import { workspaces } from "./workspaces";

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
