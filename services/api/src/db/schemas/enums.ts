/**
 * Shared Postgres enums + primitive helpers used across multiple domain
 * schemas. Each named enum maps 1:1 to a `CREATE TYPE ... AS ENUM (...)` in
 * the migrated DB.
 */
import { pgEnum } from "drizzle-orm/pg-core";

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

export const visibilityKind = pgEnum("visibility_kind", [
  "private",
  "unlisted",
  "workspace",
  "public",
]);

export const resourceKind = pgEnum("resource_kind", [
  "project",
  "page",
  "canvas",
  "meeting",
  "component",
]);

export const componentLanguage = pgEnum("component_language", ["html", "tsx"]);

export const sharePermission = pgEnum("share_permission", [
  "viewer",
  "commenter",
  "editor",
  "admin",
]);

export const shareStatus = pgEnum("share_status", ["active", "pending", "revoked", "expired"]);

export const canvasAssetFormat = pgEnum("canvas_asset_format", ["svg", "png"]);
