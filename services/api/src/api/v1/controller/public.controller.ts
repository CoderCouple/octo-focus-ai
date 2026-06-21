/**
 * Public read endpoints — NO auth. Three paths:
 *
 *   GET  /public/p/:workspaceSlug/:slug
 *   POST /public/share/:token
 *   GET  /public/i/:slug
 */
import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  StreamableFile,
} from "@nestjs/common";
import { Readable } from "stream";
import { z } from "zod";
import { ZodValidationPipe } from "../../../common/zod-validation.pipe";
import { PublicService } from "../../../service/public.service";
import {
  PublicShareTokenBodySchema,
  type PublicShareTokenBody,
} from "../request/sharing.request";
import type {
  PublicResourcePayload,
  PublicShareTokenPayload,
} from "../response/public.response";

const SlugParam = new ZodValidationPipe(z.string().min(1).max(120));
const TokenParam = new ZodValidationPipe(z.string().min(8).max(64));

@Controller("public")
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get("p/:workspaceSlug/:slug")
  getBySlug(
    @Param("workspaceSlug", SlugParam) workspaceSlug: string,
    @Param("slug", SlugParam) slug: string,
  ): Promise<PublicResourcePayload> {
    return this.publicService.getBySlug(workspaceSlug, slug);
  }

  @Get("i/:slug")
  @Header("cache-control", "public, max-age=60, s-maxage=60")
  async getImageBySlug(@Param("slug", SlugParam) slug: string): Promise<StreamableFile> {
    const asset = await this.publicService.getImageBySlug(slug);
    return new StreamableFile(Readable.from(asset.content), {
      type: asset.contentType,
      length: asset.content.length,
    });
  }

  @Post("share/:token")
  getByShareToken(
    @Param("token", TokenParam) token: string,
    @Body(new ZodValidationPipe(PublicShareTokenBodySchema)) body: PublicShareTokenBody,
  ): Promise<PublicShareTokenPayload> {
    return this.publicService.getByShareToken(token, body.password);
  }
}
