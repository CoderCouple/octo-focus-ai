import type { cliTokens } from "../db/schemas/cli-tokens";

export interface CliToken {
  id: string;
  userId: string;
  name: string;
  tokenPreview: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}

export function toCliToken(row: typeof cliTokens.$inferSelect): CliToken {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    tokenPreview: row.tokenPreview,
    lastUsedAt: row.lastUsedAt,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    revokedAt: row.revokedAt,
  };
}
