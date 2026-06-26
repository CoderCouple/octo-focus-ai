import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { generateId } from "@octofocus/shared";
import { visibilityKind } from "./enums";
import { users } from "./users";
import { workspaces } from "./workspaces";

/**
 * Saved figure groups extracted from a canvas. Stored independently
 * of canvases so a figure can be referenced from many notes via
 * figureId — the canvas "Save figure → /f/<id> URL → paste in note"
 * flow that mirrors how Components embed.
 *
 * `dsl` is the figure's subgraph in our diagram DSL (parseable by
 * `@octofocus/diagrams`). The note block re-renders from this on
 * mount, so the embed reflects any subsequent edits applied through
 * the Save action.
 *
 * Default visibility is `unlisted` so the `/f/<id>` link works
 * without an explicit publish step.
 */
export const figures = pgTable(
  "figures",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId("fig")),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description"),
    dsl: text("dsl").notNull(),

    publicSlug: text("public_slug").unique(),
    visibility: visibilityKind("visibility").default("unlisted").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    lastPublishedAt: timestamp("last_published_at", { withTimezone: true }),
    settings: jsonb("settings").default(sql`'{}'::jsonb`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    workspaceIdx: index("figures_workspace_id_idx").on(table.workspaceId),
    createdByIdx: index("figures_created_by_user_id_idx").on(table.createdByUserId),
    publicSlugIdx: index("figures_public_slug_idx").on(table.publicSlug),
  }),
);
