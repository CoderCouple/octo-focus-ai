import {
  Controller,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Param,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { AuthenticatedRequest } from "../auth/supabase-auth.guard";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { Database, DRIZZLE } from "../db/database.module";
import { changeEvents, workspaceMembers } from "../db/schema";

const UuidParam = new ZodValidationPipe(z.string().uuid());
const ListQuery = new ZodValidationPipe(
  z.object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    entityType: z.string().optional(),
    entityId: z.string().uuid().optional(),
  }),
);

@Controller()
@UseGuards(SupabaseAuthGuard)
export class ChangeEventsController {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  @Get("workspaces/:workspaceId/change-events")
  async list(
    @Param("workspaceId", UuidParam) workspaceId: string,
    @Query(ListQuery)
    query: { limit: number; entityType?: string; entityId?: string },
    @Req() request: AuthenticatedRequest,
  ) {
    await this.assertMember(request.user.id, workspaceId);

    const filters = [eq(changeEvents.workspaceId, workspaceId)];
    if (query.entityType) filters.push(eq(changeEvents.entityType, query.entityType));
    if (query.entityId) filters.push(eq(changeEvents.entityId, query.entityId));

    return this.db
      .select()
      .from(changeEvents)
      .where(and(...filters))
      .orderBy(desc(changeEvents.createdAt))
      .limit(query.limit);
  }

  @Get("change-events/:id")
  async getOne(@Param("id", UuidParam) id: string, @Req() request: AuthenticatedRequest) {
    const [row] = await this.db
      .select()
      .from(changeEvents)
      .where(eq(changeEvents.id, id))
      .limit(1);
    if (!row) throw new NotFoundException("Change event not found.");
    await this.assertMember(request.user.id, row.workspaceId);
    return row;
  }

  private async assertMember(userId: string, workspaceId: string) {
    const [member] = await this.db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)),
      )
      .limit(1);
    if (!member) throw new ForbiddenException("Not a member of this workspace.");
  }
}
