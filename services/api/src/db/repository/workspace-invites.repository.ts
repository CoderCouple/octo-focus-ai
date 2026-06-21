import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { Database, DRIZZLE } from "../database.module";
import { workspaceInvites } from "../schemas/workspaces";
import { BaseRepository } from "./base.repository";

@Injectable()
export class WorkspaceInvitesRepository extends BaseRepository<typeof workspaceInvites> {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db, workspaceInvites);
  }

  async findByWorkspaceAndEmail(workspaceId: string, email: string) {
    const rows = await this.db
      .select()
      .from(workspaceInvites)
      .where(
        and(
          eq(workspaceInvites.workspaceId, workspaceId),
          eq(workspaceInvites.email, email),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async listPendingForEmail(email: string) {
    return this.db
      .select()
      .from(workspaceInvites)
      .where(
        and(eq(workspaceInvites.email, email), eq(workspaceInvites.status, "pending")),
      );
  }

  async markAccepted(id: string) {
    await this.db
      .update(workspaceInvites)
      .set({ status: "active", acceptedAt: new Date() })
      .where(eq(workspaceInvites.id, id));
  }
}
