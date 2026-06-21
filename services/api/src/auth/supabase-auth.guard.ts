import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { buildIdFromUuid } from "@octofocus/shared";
import { Database, DRIZZLE } from "../db/database.module";
import { canvases, projects, users, workspaceMembers, workspaces } from "../db/schema";
import { SUPABASE_CLIENT } from "./supabase.tokens";

export interface AuthenticatedRequest {
  user: User & { id: string };
  headers: Record<string, string | undefined>;
}

const DEV_AUTH_SUB = "00000000-0000-0000-0000-000000000000";
const DEV_USER_ID = buildIdFromUuid("usr", DEV_AUTH_SUB);
const DEV_WORKSPACE_ID = buildIdFromUuid("wsp", "00000000-0000-0000-0000-000000000002");
const DEV_MEMBERSHIP_ID = buildIdFromUuid("mem", "00000000-0000-0000-0000-000000000001");
export const DEV_PROJECT_ID = buildIdFromUuid("prj", "00000000-0000-0000-0000-000000000003");
export const DEV_CANVAS_ID = buildIdFromUuid("cnv", "00000000-0000-0000-0000-000000000004");

const DEV_USER: User = {
  id: DEV_USER_ID,
  email: "dev@octofocus.local",
  app_metadata: {},
  user_metadata: { name: "Dev User" },
  aud: "authenticated",
  created_at: new Date(0).toISOString(),
};

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private devSeeded = false;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (process.env.DEV_AUTH_BYPASS === "true") {
      await this.ensureDevSeed();
      request.user = DEV_USER;
      return true;
    }

    const header = request.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

    if (!token) {
      throw new UnauthorizedException("Missing bearer token.");
    }

    const { data, error } = await this.supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException("Invalid Supabase session.");
    }

    // Rewrite Supabase's raw UUID into our prefixed form so downstream code
    // always sees the same `usr_<uuid>` shape, in dev and prod.
    request.user = { ...data.user, id: buildIdFromUuid("usr", data.user.id) };
    return true;
  }

  private async ensureDevSeed() {
    if (this.devSeeded) return;
    await this.db.transaction(async (tx) => {
      await tx
        .insert(users)
        .values({ id: DEV_USER_ID, email: "dev@octofocus.local", name: "Dev User" })
        .onConflictDoNothing();
      await tx
        .insert(workspaces)
        .values({ id: DEV_WORKSPACE_ID, name: "Dev workspace", slug: "dev-workspace" })
        .onConflictDoNothing();
      await tx
        .insert(workspaceMembers)
        .values({
          id: DEV_MEMBERSHIP_ID,
          workspaceId: DEV_WORKSPACE_ID,
          userId: DEV_USER_ID,
          role: "OWNER",
        })
        .onConflictDoNothing();
      await tx
        .insert(projects)
        .values({
          id: DEV_PROJECT_ID,
          workspaceId: DEV_WORKSPACE_ID,
          name: "Sandbox",
          description: "Default playground for the OctoFocusAI dev workspace.",
        })
        .onConflictDoNothing();
      await tx
        .insert(canvases)
        .values({
          id: DEV_CANVAS_ID,
          projectId: DEV_PROJECT_ID,
          title: "Default canvas",
          document: {},
        })
        .onConflictDoNothing();
    });
    this.devSeeded = true;
  }
}
