import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../../auth/supabase-auth.guard";
import { SupabaseAuthGuard } from "../../../auth/supabase-auth.guard";
import { ZodValidationPipe } from "../../../common/zod-validation.pipe";
import { CliTokensService } from "../../../service/cli-tokens.service";
import { CliTokenCreateSchema, type CliTokenCreate } from "../request/cli-token.request";
import {
  cliTokenCreatedToDto,
  cliTokenToDto,
  type CliTokenCreatedDto,
  type CliTokenDto,
} from "../response/cli-token.response";

const IdParam = new ZodValidationPipe(z.string().min(1).max(64));

@Controller("me/cli-tokens")
@UseGuards(SupabaseAuthGuard)
export class CliTokensController {
  constructor(private readonly tokens: CliTokensService) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest): Promise<CliTokenDto[]> {
    const rows = await this.tokens.list(req.user.id);
    return rows.map(cliTokenToDto);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(CliTokenCreateSchema)) body: CliTokenCreate,
    @Req() req: AuthenticatedRequest,
  ): Promise<CliTokenCreatedDto> {
    const { token, plaintext } = await this.tokens.create(req.user.id, body);
    return cliTokenCreatedToDto(token, plaintext);
  }

  @Delete(":id")
  async revoke(
    @Param("id", IdParam) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<CliTokenDto> {
    return cliTokenToDto(await this.tokens.revoke(id, req.user.id));
  }
}
