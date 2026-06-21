import { BadRequestException, Controller, Get, Inject, Req, UseGuards } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import type { AuthenticatedRequest } from "../auth/supabase-auth.guard";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { Database, DRIZZLE } from "../db/database.module";
import { users, workspaceInvites, workspaceMembers, workspaces } from "../db/schema";

// users.id is already `usr_<uuid>` by the time it reaches this controller —
// the auth guard rewrites Supabase's raw JWT subject into the prefixed form.

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30) || "workspace"
  );
}

@Controller("me")
@UseGuards(SupabaseAuthGuard)
export class MeController {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  @Get()
  async getMe(@Req() request: AuthenticatedRequest) {
    const supabaseUser = request.user;
    const email = supabaseUser.email;
    if (!email) {
      throw new BadRequestException("Supabase user has no email.");
    }

    const name =
      (supabaseUser.user_metadata?.full_name as string | undefined) ??
      (supabaseUser.user_metadata?.name as string | undefined) ??
      email.split("@")[0];
    const avatarUrl =
      (supabaseUser.user_metadata?.avatar_url as string | undefined) ?? null;

    return this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ id: supabaseUser.id, email, name, avatarUrl })
        .onConflictDoUpdate({
          target: users.id,
          set: { email, name, avatarUrl, updatedAt: new Date() },
        })
        .returning();

      if (!user) {
        throw new BadRequestException("Failed to upsert user.");
      }

      // Convert any pending workspace_invites for this email into real
      // memberships. The invite row is marked accepted; if a duplicate
      // membership already exists we just drop the invite.
      const pendingInvites = await tx
        .select()
        .from(workspaceInvites)
        .where(
          and(
            eq(workspaceInvites.email, email.toLowerCase()),
            eq(workspaceInvites.status, "pending"),
          ),
        );
      for (const invite of pendingInvites) {
        const [existing] = await tx
          .select({ id: workspaceMembers.id })
          .from(workspaceMembers)
          .where(
            and(
              eq(workspaceMembers.workspaceId, invite.workspaceId),
              eq(workspaceMembers.userId, user.id),
            ),
          )
          .limit(1);
        if (!existing) {
          await tx.insert(workspaceMembers).values({
            workspaceId: invite.workspaceId,
            userId: user.id,
            role: invite.role,
          });
        }
        await tx
          .update(workspaceInvites)
          .set({ status: "active", acceptedAt: new Date() })
          .where(eq(workspaceInvites.id, invite.id));
      }

      let memberships = await tx
        .select({ membership: workspaceMembers, workspace: workspaces })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
        .where(eq(workspaceMembers.userId, user.id));

      if (memberships.length === 0) {
        const slug = `${slugify(email.split("@")[0])}-${user.id.slice(0, 6)}`;
        const workspaceName = `${name}'s workspace`;
        const [workspace] = await tx
          .insert(workspaces)
          .values({ name: workspaceName, slug })
          .returning();
        const [membership] = await tx
          .insert(workspaceMembers)
          .values({ workspaceId: workspace.id, userId: user.id, role: "OWNER" })
          .returning();
        memberships = [{ membership, workspace }];
      }

      return { user, memberships };
    });
  }
}
