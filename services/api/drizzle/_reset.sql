-- =============================================================================
-- DEV DATABASE RESET — drops the entire app schema in the public namespace.
--
-- Run this BEFORE the next migration when moving from raw UUID IDs to the
-- prefixed `usr_/wsp_/prj_/...` TEXT IDs. After running, apply the migrations
-- in ./drizzle to recreate the schema.
--
-- Safe only in dev. Do NOT run against prod — it irreversibly deletes data.
-- =============================================================================

DROP TABLE IF EXISTS
  "share_links",
  "resource_shares",
  "user_preferences",
  "change_events",
  "ai_runs",
  "agents",
  "canvas_snapshots",
  "page_canvas_links",
  "canvases",
  "page_blocks",
  "pages",
  "projects",
  "workspace_members",
  "workspaces",
  "users"
CASCADE;

DROP TYPE IF EXISTS
  "share_status",
  "share_permission",
  "resource_kind",
  "visibility_kind",
  "change_actor_type",
  "ai_run_status",
  "agent_status",
  "workspace_role"
CASCADE;

-- Drizzle's own migration ledger — drop it so applying the new 0000_* migration
-- starts from a clean slate.
DROP TABLE IF EXISTS "drizzle"."__drizzle_migrations" CASCADE;
DROP SCHEMA IF EXISTS "drizzle" CASCADE;
