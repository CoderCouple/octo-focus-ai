/**
 * Public read endpoints — NO auth. Three paths:
 *
 *   GET  /public/p/:workspaceSlug/:slug
 *   POST /public/share/:token
 *   GET  /public/i/:slug
 */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Post,
  Query,
  StreamableFile,
} from "@nestjs/common";
import { Readable } from "stream";
import { z } from "zod";
import { ZodValidationPipe } from "../../../common/zod-validation.pipe";
import {
  PublicService,
  type PublicLookupKind,
  type PublicLookupResult,
} from "../../../service/public.service";
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

  /**
   * Unauthenticated lookup for the focus-route redirect dance. The
   * web middleware calls this when an unauthenticated visitor hits
   * `/note/<id>` / `/canvas/<id>` / `/project/<id>` and we want to
   * redirect to the public URL instead of /login when the resource
   * is published.
   */
  @Get("lookup")
  async lookup(
    @Query("kind") kind: string,
    @Query("id") id: string,
  ): Promise<PublicLookupResult> {
    if (!id || typeof id !== "string") {
      throw new BadRequestException("Missing id.");
    }
    if (kind !== "page" && kind !== "canvas" && kind !== "project") {
      throw new BadRequestException("Invalid kind.");
    }
    const hit = await this.publicService.lookupById(kind as PublicLookupKind, id);
    if (!hit) throw new NotFoundException("Not publicly viewable.");
    return hit;
  }

  @Post("share/:token")
  getByShareToken(
    @Param("token", TokenParam) token: string,
    @Body(new ZodValidationPipe(PublicShareTokenBodySchema)) body: PublicShareTokenBody,
  ): Promise<PublicShareTokenPayload> {
    return this.publicService.getByShareToken(token, body.password);
  }
}
