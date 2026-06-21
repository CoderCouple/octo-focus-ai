import {
  bigint,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { generateId } from "@octofocus/shared";
import { resourceKind, sharePermission, shareStatus } from "./enums";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const resourceShares = pgTable(
  "resource_shares",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId("shr")),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    resourceKind: resourceKind("resource_kind").notNull(),
    resourceId: text("resource_id").notNull(),
    grantedToUserId: text("granted_to_user_id").references(() => users.id, { onDelete: "cascade" }),
    grantedToEmail: text("granted_to_email"),
    permission: sharePermission("permission").default("viewer").notNull(),
    status: shareStatus("status").default("active").notNull(),
    grantedByUserId: text("granted_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    note: text("note"),
  },
  (table) => ({
    subjectXor: check(
      "resource_shares_subject_xor",
      sql`(${table.grantedToUserId} IS NOT NULL AND ${table.grantedToEmail} IS NULL)
          OR (${table.grantedToUserId} IS NULL AND ${table.grantedToEmail} IS NOT NULL)`,
    ),
    statusEmail: check(
      "resource_shares_status_email",
      sql`NOT (${table.status} = 'pending' AND ${table.grantedToEmail} IS NULL)`,
    ),
    resourceIdx: index("resource_shares_resource_idx").on(table.resourceKind, table.resourceId),
    userIdx: index("resource_shares_user_idx").on(table.grantedToUserId),
    pendingEmailIdx: index("resource_shares_pending_email_idx").on(table.grantedToEmail),
  }),
);

export const shareLinks = pgTable(
  "share_links",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId("lnk")),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    resourceKind: resourceKind("resource_kind").notNull(),
    resourceId: text("resource_id").notNull(),
    token: text("token").notNull().unique(),
    permission: sharePermission("permission").default("viewer").notNull(),
    passwordHash: text("password_hash"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    maxUses: integer("max_uses"),
    useCount: bigint("use_count", { mode: "number" }).default(0).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    note: text("note"),
  },
  (table) => ({
    resourceIdx: index("share_links_resource_idx").on(table.resourceKind, table.resourceId),
    tokenIdx: index("share_links_token_idx").on(table.token),
  }),
);
