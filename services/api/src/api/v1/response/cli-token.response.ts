import type { CliToken } from "../../../model/cli-token.model";

export interface CliTokenDto {
  id: string;
  userId: string;
  name: string;
  tokenPreview: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface CliTokenCreatedDto extends CliTokenDto {
  /** Plaintext token. Returned exactly once. Never logged, never re-fetchable. */
  plaintext: string;
}

export function cliTokenToDto(token: CliToken): CliTokenDto {
  return {
    id: token.id,
    userId: token.userId,
    name: token.name,
    tokenPreview: token.tokenPreview,
    lastUsedAt: token.lastUsedAt ? token.lastUsedAt.toISOString() : null,
    expiresAt: token.expiresAt ? token.expiresAt.toISOString() : null,
    createdAt: token.createdAt.toISOString(),
    revokedAt: token.revokedAt ? token.revokedAt.toISOString() : null,
  };
}

export function cliTokenCreatedToDto(
  token: CliToken,
  plaintext: string,
): CliTokenCreatedDto {
  return { ...cliTokenToDto(token), plaintext };
}
