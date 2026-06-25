import {
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { generateId } from "@octofocus/shared";
import { visibilityKind } from "./enums";
import { users } from "./users";
import { workspaces } from "./workspaces";

// Drizzle has no first-class bytea — declare it locally for the audio
// blob. Matches the same pattern used in canvas_assets.
const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
});

/**
 * Meeting = a recorded conversation + its transcript + a written
 * summary. The audio lives on the same row as a bytea blob so the
 * MVP doesn't need Supabase Storage setup. Detail / list endpoints
 * never select the audio column — it's only streamed via a dedicated
 * `GET /meetings/:id/audio` route.
 *
 * Soft-delete via `deletedAt` matches pages + canvases. Standalone
 * workspace resource (no project FK) so meetings live independently
 * in the workspace's left-nav.
 */
export const meetings = pgTable(
  "meetings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId("mtg")),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description"),
    transcript: text("transcript").default("").notNull(),
    summary: text("summary").default("").notNull(),

    // Audio fields. All nullable: a meeting may exist before its
    // recording is uploaded (e.g. created from the "New meeting" button
    // before the user hits Record).
    audioContent: bytea("audio_content"),
    audioContentType: text("audio_content_type"),
    audioDurationSec: integer("audio_duration_sec"),
    audioSizeBytes: integer("audio_size_bytes"),
    audioUploadedAt: timestamp("audio_uploaded_at", { withTimezone: true }),

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
    workspaceIdx: index("meetings_workspace_id_idx").on(table.workspaceId),
    createdByIdx: index("meetings_created_by_user_id_idx").on(table.createdByUserId),
    publicSlugIdx: index("meetings_public_slug_idx").on(table.publicSlug),
  }),
);
