import {
  Body,
  Controller,
  Param,
  Patch,
  Req,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../../auth/supabase-auth.guard";
import { SupabaseAuthGuard } from "../../../auth/supabase-auth.guard";
import { ZodValidationPipe } from "../../../common/zod-validation.pipe";
import { PublishService } from "../../../service/publish.service";
import {
  PublishUpdateSchema,
  type PublishUpdate,
} from "../request/publish.request";
import type { PublishedResourceDto } from "../response/publish.response";

const IdParam = new ZodValidationPipe(z.string().min(1).max(64));

@Controller()
@UseGuards(SupabaseAuthGuard)
export class PublishController {
  constructor(private readonly publish: PublishService) {}

  @Patch("projects/:id/publish")
  publishProject(
    @Param("id", IdParam) id: string,
    @Body(new ZodValidationPipe(PublishUpdateSchema)) body: PublishUpdate,
    @Req() req: AuthenticatedRequest,
  ): Promise<PublishedResourceDto> {
    return this.publish.publish("project", id, body, req.user.id);
  }

  @Patch("pages/:id/publish")
  publishPage(
    @Param("id", IdParam) id: string,
    @Body(new ZodValidationPipe(PublishUpdateSchema)) body: PublishUpdate,
    @Req() req: AuthenticatedRequest,
  ): Promise<PublishedResourceDto> {
    return this.publish.publish("page", id, body, req.user.id);
  }

  @Patch("canvases/:id/publish")
  publishCanvas(
    @Param("id", IdParam) id: string,
    @Body(new ZodValidationPipe(PublishUpdateSchema)) body: PublishUpdate,
    @Req() req: AuthenticatedRequest,
  ): Promise<PublishedResourceDto> {
    return this.publish.publish("canvas", id, body, req.user.id);
  }
}
