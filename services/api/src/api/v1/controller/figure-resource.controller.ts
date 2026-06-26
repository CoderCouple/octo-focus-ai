import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import {
  AuthenticatedRequest,
  SupabaseAuthGuard,
} from "../../../auth/supabase-auth.guard";
import { ZodValidationPipe } from "../../../common/zod-validation.pipe";
import { FiguresService } from "../../../service/figures.service";
import {
  FigureResourceCreateSchema,
  FigureResourceUpdateSchema,
  type FigureResourceCreate,
  type FigureResourceUpdate,
} from "../request/figure-resource.request";
import {
  figureToDto,
  figureToPublicDto,
  type FigureResourceDto,
  type PublicFigureDto,
  type WorkspaceFigureSummaryDto,
} from "../response/figure-resource.response";

const IdParam = new ZodValidationPipe(z.string().min(1).max(64));

@Controller()
@UseGuards(SupabaseAuthGuard)
export class FigureResourceController {
  constructor(private readonly figures: FiguresService) {}

  @Get("workspaces/:workspaceId/saved-figures")
  async listForWorkspace(
    @Param("workspaceId", IdParam) workspaceId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<WorkspaceFigureSummaryDto[]> {
    const rows = await this.figures.listForWorkspace(workspaceId, req.user.id);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      visibility: r.visibility,
      publicSlug: r.publicSlug,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      creator: r.creator,
      sharedCount: r.sharedCount,
    }));
  }

  @Get("saved-figures/:id")
  async getOne(
    @Param("id", IdParam) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<FigureResourceDto> {
    return figureToDto(await this.figures.getOne(id, req.user.id));
  }

  @Post("workspaces/:workspaceId/saved-figures")
  async create(
    @Param("workspaceId", IdParam) workspaceId: string,
    @Body(new ZodValidationPipe(FigureResourceCreateSchema)) body: FigureResourceCreate,
    @Req() req: AuthenticatedRequest,
  ): Promise<FigureResourceDto> {
    return figureToDto(await this.figures.create(workspaceId, body, req.user.id));
  }

  @Patch("saved-figures/:id")
  async update(
    @Param("id", IdParam) id: string,
    @Body(new ZodValidationPipe(FigureResourceUpdateSchema)) body: FigureResourceUpdate,
    @Req() req: AuthenticatedRequest,
  ): Promise<FigureResourceDto> {
    return figureToDto(await this.figures.update(id, body, req.user.id));
  }

  @Delete("saved-figures/:id")
  async delete(
    @Param("id", IdParam) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<FigureResourceDto> {
    return figureToDto(await this.figures.softDelete(id, req.user.id));
  }
}

/**
 * Unauthenticated read for the /f/<id> embed URL. Returns minimal
 * payload (dsl + title) so the public page renders and notes that
 * reference a figure via `figureId` can hydrate even for visitors
 * without an account.
 */
@Controller("public")
export class PublicFigureController {
  constructor(private readonly figures: FiguresService) {}

  @Get("figures/:id")
  async getPublic(@Param("id", IdParam) id: string): Promise<PublicFigureDto> {
    const row = await this.figures.getPublicById(id);
    if (!row) throw new NotFoundException("Figure not publicly viewable.");
    return figureToPublicDto(row);
  }
}
