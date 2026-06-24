import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { buildIdFromUuid } from "@octofocus/shared";
import { Database, DRIZZLE } from "../db/database.module";
import { cliTokens, users } from "../db/schema";
import { SUPABASE_CLIENT } from "./supabase.tokens";

export interface AuthenticatedRequest {
  user: User & { id: string };
  headers: Record<string, string | undefined>;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

    if (!token) {
      throw new UnauthorizedException("Missing bearer token.");
    }

    // CLI / agent tokens: prefixed `oft_…`. Plaintext is SHA-256-hashed on
    // create (see services/api/src/service/cli-tokens.service.ts). Look up
    // by hash, enforce revoke + expiry, then attach the owning user.
    if (token.startsWith("oft_")) {
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const rows = await this.db
        .select()
        .from(cliTokens)
        .where(and(eq(cliTokens.tokenHash, tokenHash), isNull(cliTokens.revokedAt)))
        .limit(1);
      const row = rows[0];
      if (!row) throw new UnauthorizedException("Invalid CLI token.");
      if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
        throw new UnauthorizedException("CLI token has expired.");
      }
      const userRows = await this.db
        .select()
        .from(users)
        .where(eq(users.id, row.userId))
        .limit(1);
      const userRow = userRows[0];
      if (!userRow) throw new UnauthorizedException("CLI token's owner no longer exists.");
      // Bump last_used_at out-of-band; we don't want to block the request
      // if it fails (e.g., read-replica) and the value is purely informational.
      void this.db
        .update(cliTokens)
        .set({ lastUsedAt: new Date() })
        .where(eq(cliTokens.id, row.id))
        .catch(() => undefined);

      request.user = {
        id: userRow.id,
        email: userRow.email,
        app_metadata: {},
        user_metadata: { name: userRow.name, cliTokenId: row.id },
        aud: "authenticated",
        created_at: userRow.createdAt.toISOString(),
      } as User & { id: string };
      return true;
    }

    const { data, error } = await this.supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException("Invalid Supabase session.");
    }

    // Rewrite Supabase's raw UUID into our prefixed form so downstream code
    // always sees the same `usr_<uuid>` shape.
    request.user = { ...data.user, id: buildIdFromUuid("usr", data.user.id) };
    return true;
  }
}
