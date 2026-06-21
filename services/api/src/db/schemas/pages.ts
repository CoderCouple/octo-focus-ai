import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { generateId } from "@octofocus/shared";
import { visibilityKind } from "./enums";
import { projects } from "./projects";

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
