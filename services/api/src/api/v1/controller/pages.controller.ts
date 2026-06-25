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
import { PagesService } from "../../../service/pages.service";
import {
  PageCreateSchema,
  PageUpdateSchema,
  type PageCreate,
  type PageUpdate,
} from "../request/page.request";
import {
  pageToDto,
  type PageDto,
  type WorkspacePageSummaryDto,
} from "../response/page.response";

const IdParam = new ZodValidationPipe(z.string().min(1).max(64));

@Controller()
@UseGuards(SupabaseAuthGuard)
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  @Get("projects/:projectId/pages")
  async list(
    @Param("projectId", IdParam) projectId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<PageDto[]> {
    const items = await this.pages.listByProject(projectId, req.user.id);
    return items.map(pageToDto);
  }

  @Get("workspaces/:workspaceId/pages")
  async listForWorkspace(
    @Param("workspaceId", IdParam) workspaceId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<WorkspacePageSummaryDto[]> {
    const rows = await this.pages.listForWorkspace(workspaceId, req.user.id);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      projectId: r.projectId,
      projectName: r.projectName,
      contentMd: r.contentMd,
      publicSlug: r.publicSlug,
      visibility: r.visibility as PageDto["visibility"],
      updatedAt: r.updatedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      creator: r.creator,
      sharedCount: r.sharedCount,
    }));
  }

  @Post("projects/:projectId/pages")
  async create(
    @Param("projectId", IdParam) projectId: string,
    @Body(new ZodValidationPipe(PageCreateSchema)) body: PageCreate,
    @Req() req: AuthenticatedRequest,
  ): Promise<PageDto> {
    return pageToDto(await this.pages.create(projectId, body, req.user.id));
  }

  @Get("pages/:id")
  async getOne(
    @Param("id", IdParam) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<PageDto> {
    return pageToDto(await this.pages.getOne(id, req.user.id));
  }

  @Patch("pages/:id")
  async update(
    @Param("id", IdParam) id: string,
    @Body(new ZodValidationPipe(PageUpdateSchema)) body: PageUpdate,
    @Req() req: AuthenticatedRequest,
  ): Promise<PageDto> {
    return pageToDto(await this.pages.update(id, body, req.user.id));
  }

  @Delete("pages/:id")
  async softDelete(
    @Param("id", IdParam) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<PageDto> {
    return pageToDto(await this.pages.softDelete(id, req.user.id));
  }
}
