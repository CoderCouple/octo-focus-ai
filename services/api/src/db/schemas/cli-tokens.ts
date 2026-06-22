import { generateId } from "@octofocus/shared";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Long-lived bearer tokens for non-interactive callers (CLI, CI, Claude
 * skills). The plaintext (`oft_<32-byte-base64url>`) is shown to the user
 * exactly once on creation and stored hashed (SHA-256) at rest. A 4-char
 * preview suffix is kept in the clear so the UI can render
 * "oft_…abcd" without needing the plaintext.
 *
 * One row per active token; revoked tokens are kept for audit by setting
 * `revoked_at`. Each verified request bumps `last_used_at`.
 */
export const cliTokens = pgTable(
  "cli_tokens",
  {
    id: text("id").primaryKey().$defaultFn(() => generateId("cli")),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull(),
    tokenPreview: text("token_preview").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => ({
    hashIdx: uniqueIndex("cli_tokens_token_hash_idx").on(table.tokenHash),
    userCreatedIdx: index("cli_tokens_user_id_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
  }),
);
