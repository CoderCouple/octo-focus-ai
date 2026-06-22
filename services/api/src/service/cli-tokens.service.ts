/**
 * CLI / agent token lifecycle.
 *
 * Plaintext format: `oft_<base64url-32-bytes>`.
 *   - returned only from create() so callers can hand it to a CLI / env var.
 *   - stored as SHA-256 hash; a 4-char preview suffix is also kept so the
 *     UI can render "oft_…abcd" without needing the plaintext.
 *
 * Verification (used by SupabaseAuthGuard) is intentionally not in this
 * service — keep verification stateless and dependency-light so the guard
 * doesn't need to import the whole service graph.
 */
import { Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { Forbidden, NotFound } from "../common/error/error-factory";
import { CliTokensRepository } from "../db/repository/cli-tokens.repository";
import { toCliToken, type CliToken } from "../model/cli-token.model";

export interface CliTokenCreateInput {
  name: string;
  expiresInDays?: number;
}

export interface CliTokenCreatedWithPlaintext {
  token: CliToken;
  plaintext: string;
}

@Injectable()
export class CliTokensService {
  constructor(private readonly repo: CliTokensRepository) {}

  async list(userId: string): Promise<CliToken[]> {
    const rows = await this.repo.listForUser(userId);
    return rows.map(toCliToken);
  }

  async create(userId: string, input: CliTokenCreateInput): Promise<CliTokenCreatedWithPlaintext> {
    const plaintext = mintPlaintext();
    const tokenHash = hashToken(plaintext);
    const tokenPreview = plaintext.slice(-4);
    const expiresAt = input.expiresInDays
      ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const row = await this.repo.insert({
      userId,
      name: input.name,
      tokenHash,
      tokenPreview,
      expiresAt,
    });
    return { token: toCliToken(row), plaintext };
  }

  async revoke(id: string, userId: string): Promise<CliToken> {
    const existing = await this.repo.findById(id);
    if (!existing) throw NotFound("CLI token not found.");
    if (existing.userId !== userId) throw Forbidden("Not your CLI token.");
    if (existing.revokedAt) return toCliToken(existing);
    const revoked = await this.repo.revoke(id);
    if (!revoked) throw NotFound("CLI token not found.");
    return toCliToken(revoked);
  }
}

function mintPlaintext(): string {
  return `oft_${randomBytes(32).toString("base64url")}`;
}

export function hashToken(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}
