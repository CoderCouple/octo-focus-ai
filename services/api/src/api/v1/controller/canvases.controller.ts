import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../../auth/supabase-auth.guard";
import { SupabaseAuthGuard } from "../../../auth/supabase-auth.guard";
import { ZodValidationPipe } from "../../../common/zod-validation.pipe";
import { CanvasesService } from "../../../service/canvases.service";
import {
  CanvasCreateSchema,
  CanvasUpdateSchema,
  type CanvasCreate,
  type CanvasUpdate,
} from "../request/canvas.request";
import {
  canvasToDto,
  type CanvasDto,
  type WorkspaceCanvasSummaryDto,
} from "../response/canvas.response";

const IdParam = new ZodValidationPipe(z.string().min(1).max(64));

@Controller()
@UseGuards(SupabaseAuthGuard)
export class CanvasesController {
  constructor(private readonly canvases: CanvasesService) {}

  @Get("projects/:projectId/canvases")
  async list(
    @Param("projectId", IdParam) projectId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<CanvasDto[]> {
    const items = await this.canvases.listByProject(projectId, req.user.id);
    return items.map(canvasToDto);
  }

  @Get("workspaces/:workspaceId/canvases")
  async listForWorkspace(
    @Param("workspaceId", IdParam) workspaceId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<WorkspaceCanvasSummaryDto[]> {
    const rows = await this.canvases.listForWorkspace(workspaceId, req.user.id);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      projectId: r.projectId,
      projectName: r.projectName,
      publicSlug: r.publicSlug,
      visibility: r.visibility as CanvasDto["visibility"],
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  @Post("projects/:projectId/canvases")
  async create(
    @Param("projectId", IdParam) projectId: string,
    @Body(new ZodValidationPipe(CanvasCreateSchema)) body: CanvasCreate,
    @Req() req: AuthenticatedRequest,
  ): Promise<CanvasDto> {
    return canvasToDto(await this.canvases.create(projectId, body, req.user.id));
  }

  @Get("canvases/:id")
  async getOne(
    @Param("id", IdParam) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<CanvasDto> {
    return canvasToDto(await this.canvases.getOne(id, req.user.id));
  }

  @Patch("canvases/:id")
  async update(
    @Param("id", IdParam) id: string,
    @Body(new ZodValidationPipe(CanvasUpdateSchema)) body: CanvasUpdate,
    @Req() req: AuthenticatedRequest,
  ): Promise<CanvasDto> {
    return canvasToDto(await this.canvases.update(id, body, req.user.id));
  }

  @Delete("canvases/:id")
  async softDelete(
    @Param("id", IdParam) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<CanvasDto> {
    return canvasToDto(await this.canvases.softDelete(id, req.user.id));
  }
}
