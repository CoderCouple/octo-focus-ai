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
import { ComponentsService } from "../../../service/components.service";
import {
  ComponentResourceCreateSchema,
  ComponentResourceUpdateSchema,
  type ComponentResourceCreate,
  type ComponentResourceUpdate,
} from "../request/component-resource.request";
import {
  componentToDto,
  componentToPublicDto,
  type ComponentResourceDto,
  type PublicComponentDto,
  type WorkspaceComponentSummaryDto,
} from "../response/component-resource.response";

const IdParam = new ZodValidationPipe(z.string().min(1).max(64));

@Controller()
@UseGuards(SupabaseAuthGuard)
export class ComponentResourceController {
  constructor(private readonly components: ComponentsService) {}

  @Get("workspaces/:workspaceId/saved-components")
  async listForWorkspace(
    @Param("workspaceId", IdParam) workspaceId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<WorkspaceComponentSummaryDto[]> {
    const rows = await this.components.listForWorkspace(workspaceId, req.user.id);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      language: r.language,
      visibility: r.visibility,
      publicSlug: r.publicSlug,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      creator: r.creator,
      sharedCount: r.sharedCount,
    }));
  }

  @Get("saved-components/:id")
  async getOne(
    @Param("id", IdParam) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ComponentResourceDto> {
    return componentToDto(await this.components.getOne(id, req.user.id));
  }

  @Post("workspaces/:workspaceId/saved-components")
  async create(
    @Param("workspaceId", IdParam) workspaceId: string,
    @Body(new ZodValidationPipe(ComponentResourceCreateSchema)) body: ComponentResourceCreate,
    @Req() req: AuthenticatedRequest,
  ): Promise<ComponentResourceDto> {
    return componentToDto(
      await this.components.create(workspaceId, body, req.user.id),
    );
  }

  @Patch("saved-components/:id")
  async update(
    @Param("id", IdParam) id: string,
    @Body(new ZodValidationPipe(ComponentResourceUpdateSchema)) body: ComponentResourceUpdate,
    @Req() req: AuthenticatedRequest,
  ): Promise<ComponentResourceDto> {
    return componentToDto(await this.components.update(id, body, req.user.id));
  }

  @Delete("saved-components/:id")
  async delete(
    @Param("id", IdParam) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ComponentResourceDto> {
    return componentToDto(await this.components.softDelete(id, req.user.id));
  }
}

/**
 * Unauthenticated read for the /c/<id> embed URL. Returns minimal
 * payload (code + title + language) so the public artifact page can
 * render and notes that reference the component via `componentId`
 * can hydrate the iframe even for visitors without an account.
 */
@Controller("public")
export class PublicComponentController {
  constructor(private readonly components: ComponentsService) {}

  @Get("components/:id")
  async getPublic(@Param("id", IdParam) id: string): Promise<PublicComponentDto> {
    const row = await this.components.getPublicById(id);
    if (!row) throw new NotFoundException("Component not publicly viewable.");
    return componentToPublicDto(row);
  }
}
