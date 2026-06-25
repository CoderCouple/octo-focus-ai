import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { generateId } from "@octofocus/shared";
import { componentLanguage, visibilityKind } from "./enums";
import { users } from "./users";
import { workspaces } from "./workspaces";

/**
 * Generated UI components — same shape claude.ai's artifact panel
 * ships: a single self-contained HTML document (or a TSX snippet for
 * legacy refines) that renders inside an iframe.
 *
 * Stored independently of projects so they can be referenced from
 * many notes via componentId — the studio's "Save → embed URL → paste
 * in note" flow. Default visibility is `unlisted` so the /c/<id>
 * embed URL works without an explicit publish step.
 */
export const components = pgTable(
  "components",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId("cmp")),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description"),
    code: text("code").notNull(),
    language: componentLanguage("language").default("html").notNull(),

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
    workspaceIdx: index("components_workspace_id_idx").on(table.workspaceId),
    createdByIdx: index("components_created_by_user_id_idx").on(table.createdByUserId),
    publicSlugIdx: index("components_public_slug_idx").on(table.publicSlug),
  }),
);
