import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../../auth/supabase-auth.guard";
import { SupabaseAuthGuard } from "../../../auth/supabase-auth.guard";
import { ZodValidationPipe } from "../../../common/zod-validation.pipe";
import { AiRunsService } from "../../../service/ai-runs.service";
import {
  AiRunCreateSchema,
  AiRunListQuerySchema,
  AiRunUpdateSchema,
  type AiRunCreate,
  type AiRunListQuery,
  type AiRunUpdate,
} from "../request/ai-run.request";
import { aiRunToDto, type AiRunDto } from "../response/ai-run.response";

const IdParam = new ZodValidationPipe(z.string().min(1).max(64));

@Controller()
@UseGuards(SupabaseAuthGuard)
export class AiRunsController {
  constructor(private readonly runs: AiRunsService) {}

  @Get("workspaces/:workspaceId/ai-runs")
  async list(
    @Param("workspaceId", IdParam) workspaceId: string,
    @Query(new ZodValidationPipe(AiRunListQuerySchema)) query: AiRunListQuery,
    @Req() req: AuthenticatedRequest,
  ): Promise<AiRunDto[]> {
    const items = await this.runs.list(workspaceId, query.limit, req.user.id);
    return items.map(aiRunToDto);
  }

  @Post("ai-runs")
  async create(
    @Body(new ZodValidationPipe(AiRunCreateSchema)) body: AiRunCreate,
    @Req() req: AuthenticatedRequest,
  ): Promise<AiRunDto> {
    return aiRunToDto(await this.runs.create(body, req.user.id));
  }

  @Get("ai-runs/:id")
  async getOne(
    @Param("id", IdParam) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<AiRunDto> {
    return aiRunToDto(await this.runs.getOne(id, req.user.id));
  }

  @Patch("ai-runs/:id")
  async update(
    @Param("id", IdParam) id: string,
    @Body(new ZodValidationPipe(AiRunUpdateSchema)) body: AiRunUpdate,
    @Req() req: AuthenticatedRequest,
  ): Promise<AiRunDto> {
    return aiRunToDto(await this.runs.update(id, body, req.user.id));
  }
}
