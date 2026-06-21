import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { generateId } from "@octofocus/shared";
import { visibilityKind } from "./enums";
import { workspaces } from "./workspaces";

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
