import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { ShareLinksService } from "../../../service/share-links.service";
import { SharesService } from "../../../service/shares.service";
import {
  ResourceShareCreateSchema,
  ResourceShareUpdateSchema,
  ShareAcceptBodySchema,
  ShareLinkCreateSchema,
  ShareListQuerySchema,
  type ResourceShareCreate,
  type ResourceShareUpdate,
  type ShareAcceptBody,
  type ShareLinkCreate,
  type ShareListQuery,
} from "../request/sharing.request";
import {
  resourceShareToDto,
  shareLinkToDto,
  type ResourceShareDto,
  type ShareLinkDto,
} from "../response/sharing.response";

const IdParam = new ZodValidationPipe(z.string().min(1).max(64));

@Controller()
@UseGuards(SupabaseAuthGuard)
export class SharesController {
  constructor(
    private readonly shares: SharesService,
    private readonly links: ShareLinksService,
  ) {}

  // resource_shares -----------------------------------------------------------

  @Post("shares")
  async createShare(
    @Body(new ZodValidationPipe(ResourceShareCreateSchema)) body: ResourceShareCreate,
    @Req() req: AuthenticatedRequest,
  ): Promise<ResourceShareDto> {
    return resourceShareToDto(await this.shares.create(body, req.user.id, req.user.email));
  }

  @Get("shares")
  async listShares(
    @Query(new ZodValidationPipe(ShareListQuerySchema)) query: ShareListQuery,
    @Req() req: AuthenticatedRequest,
  ): Promise<ResourceShareDto[]> {
    const items = await this.shares.list(query.kind, query.id, req.user.id);
    return items.map(resourceShareToDto);
  }

  @Patch("shares/:id")
  async updateShare(
    @Param("id", IdParam) id: string,
    @Body(new ZodValidationPipe(ResourceShareUpdateSchema)) body: ResourceShareUpdate,
    @Req() req: AuthenticatedRequest,
  ): Promise<ResourceShareDto> {
    return resourceShareToDto(await this.shares.update(id, body, req.user.id));
  }

  @Delete("shares/:id")
  async revokeShare(
    @Param("id", IdParam) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ResourceShareDto> {
    return resourceShareToDto(await this.shares.revoke(id, req.user.id));
  }

  @Post("shares/:id/resend")
  @HttpCode(200)
  async resendShare(@Param("id", IdParam) id: string, @Req() req: AuthenticatedRequest) {
    await this.shares.resend(id, req.user.id, req.user.email);
    return { ok: true };
  }

  @Post("share/accept")
  async acceptShare(
    @Body(new ZodValidationPipe(ShareAcceptBodySchema)) body: ShareAcceptBody,
    @Req() req: AuthenticatedRequest,
  ): Promise<ResourceShareDto> {
    return resourceShareToDto(
      await this.shares.accept(body.shareId, req.user.id, req.user.email),
    );
  }

  // share_links --------------------------------------------------------------

  @Post("share-links")
  async createLink(
    @Body(new ZodValidationPipe(ShareLinkCreateSchema)) body: ShareLinkCreate,
    @Req() req: AuthenticatedRequest,
  ): Promise<ShareLinkDto> {
    return shareLinkToDto(await this.links.create(body, req.user.id));
  }

  @Get("share-links")
  async listLinks(
    @Query(new ZodValidationPipe(ShareListQuerySchema)) query: ShareListQuery,
    @Req() req: AuthenticatedRequest,
  ): Promise<ShareLinkDto[]> {
    const items = await this.links.list(query.kind, query.id, req.user.id);
    return items.map(shareLinkToDto);
  }

  @Delete("share-links/:id")
  async revokeLink(
    @Param("id", IdParam) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ShareLinkDto> {
    return shareLinkToDto(await this.links.revoke(id, req.user.id));
  }
}
