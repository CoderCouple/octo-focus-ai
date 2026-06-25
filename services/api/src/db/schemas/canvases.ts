import {
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { generateId } from "@octofocus/shared";
import { canvasAssetFormat, visibilityKind } from "./enums";
import { pages } from "./pages";
import { projects } from "./projects";
import { users } from "./users";

// Drizzle has no first-class bytea — declare it locally for canvas exports.
const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
});

export const canvases = pgTable(
  "canvases",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId("cnv")),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** See projects.createdByUserId — same rationale. */
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
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
    createdByIdx: index("canvases_created_by_user_id_idx").on(table.createdByUserId),
    onePerProject: uniqueIndex("canvases_one_per_project_idx")
      .on(table.projectId)
      .where(sql`deleted_at IS NULL`),
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
