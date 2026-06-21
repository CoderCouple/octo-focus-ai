import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../../auth/supabase-auth.guard";
import { SupabaseAuthGuard } from "../../../auth/supabase-auth.guard";
import { ZodValidationPipe } from "../../../common/zod-validation.pipe";
import { CanvasAssetsService } from "../../../service/canvas-assets.service";
import {
  CanvasAssetCreateSchema,
  type CanvasAssetCreate,
} from "../request/canvas.request";
import { canvasAssetToDto, type CanvasAssetDto } from "../response/canvas.response";

const IdParam = new ZodValidationPipe(z.string().min(1).max(64));

@Controller()
@UseGuards(SupabaseAuthGuard)
export class CanvasAssetsController {
  constructor(private readonly assets: CanvasAssetsService) {}

  @Post("canvases/:id/exports")
  async create(
    @Param("id", IdParam) canvasId: string,
    @Body(new ZodValidationPipe(CanvasAssetCreateSchema)) body: CanvasAssetCreate,
    @Req() req: AuthenticatedRequest,
  ): Promise<CanvasAssetDto> {
    return canvasAssetToDto(await this.assets.create(canvasId, body, req.user.id));
  }

  @Get("canvases/:id/exports")
  async list(
    @Param("id", IdParam) canvasId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<CanvasAssetDto[]> {
    const items = await this.assets.listForCanvas(canvasId, req.user.id);
    return items.map(canvasAssetToDto);
  }

  @Delete("canvas-exports/:assetId")
  async revoke(
    @Param("assetId", IdParam) assetId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<CanvasAssetDto> {
    return canvasAssetToDto(await this.assets.revoke(assetId, req.user.id));
  }
}
