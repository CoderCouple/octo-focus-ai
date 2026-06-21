import { index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { generateId } from "@octofocus/shared";
import { shareStatus, workspaceRole } from "./enums";
import { users } from "./users";

export const workspaces = pgTable("workspaces", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateId("wsp")),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId("mem")),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceRole("role").default("MEMBER").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceUserUnique: unique().on(table.workspaceId, table.userId),
    userIdx: index("workspace_members_user_id_idx").on(table.userId),
  }),
);

export const workspaceInvites = pgTable(
  "workspace_invites",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId("win")),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: workspaceRole("role").default("MEMBER").notNull(),
    invitedByUserId: text("invited_by_user_id")
      .notNull()
      .references(() => users.id),
    status: shareStatus("status").default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => ({
    workspaceEmailUnique: unique().on(table.workspaceId, table.email),
    emailIdx: index("workspace_invites_email_idx").on(table.email),
  }),
);
