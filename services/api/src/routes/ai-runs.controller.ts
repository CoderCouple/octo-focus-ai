import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  AiRunCreateSchema,
  AiRunUpdateSchema,
  type AiRunCreate,
  type AiRunUpdate,
} from "@octofocus/shared";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { AuthenticatedRequest } from "../auth/supabase-auth.guard";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { Database, DRIZZLE } from "../db/database.module";
import { aiRuns, workspaceMembers } from "../db/schema";

const IdParam = new ZodValidationPipe(z.string().min(1).max(64));
const ListQuery = new ZodValidationPipe(
  z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) }),
);

@Controller()
@UseGuards(SupabaseAuthGuard)
export class AiRunsController {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  @Get("workspaces/:workspaceId/ai-runs")
  async list(
    @Param("workspaceId", IdParam) workspaceId: string,
    @Query(ListQuery) query: { limit: number },
    @Req() request: AuthenticatedRequest,
  ) {
    await this.assertMember(request.user.id, workspaceId);
    return this.db
      .select()
      .from(aiRuns)
      .where(eq(aiRuns.workspaceId, workspaceId))
      .orderBy(desc(aiRuns.createdAt))
      .limit(query.limit);
  }

  @Post("ai-runs")
  async create(
    @Body(new ZodValidationPipe(AiRunCreateSchema)) body: AiRunCreate,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.assertMember(request.user.id, body.workspaceId);
    const [row] = await this.db
      .insert(aiRuns)
      .values({
        workspaceId: body.workspaceId,
        userId: request.user.id,
        agentId: body.agentId ?? null,
        projectId: body.projectId ?? null,
        pageId: body.pageId ?? null,
        canvasId: body.canvasId ?? null,
        action: body.action,
        input: body.input,
        status: "PENDING",
      })
      .returning();
    return row;
  }

  @Get("ai-runs/:id")
  async getOne(@Param("id", IdParam) id: string, @Req() request: AuthenticatedRequest) {
    const run = await this.loadRun(id);
    await this.assertMember(request.user.id, run.workspaceId);
    return run;
  }

  @Patch("ai-runs/:id")
  async update(
    @Param("id", IdParam) id: string,
    @Body(new ZodValidationPipe(AiRunUpdateSchema)) body: AiRunUpdate,
    @Req() request: AuthenticatedRequest,
  ) {
    const run = await this.loadRun(id);
    await this.assertMember(request.user.id, run.workspaceId);

    const terminal =
      body.status === "SUCCEEDED" || body.status === "FAILED" || body.status === "CANCELLED";
    const [row] = await this.db
      .update(aiRuns)
      .set({
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.output !== undefined ? { output: body.output } : {}),
        ...(terminal && run.completedAt == null ? { completedAt: new Date() } : {}),
      })
      .where(eq(aiRuns.id, id))
      .returning();
    return row;
  }

  private async loadRun(id: string) {
    const [row] = await this.db.select().from(aiRuns).where(eq(aiRuns.id, id)).limit(1);
    if (!row) throw new NotFoundException("AI run not found.");
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
