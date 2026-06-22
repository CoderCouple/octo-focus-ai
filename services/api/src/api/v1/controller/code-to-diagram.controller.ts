import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import type { AuthenticatedRequest } from "../../../auth/supabase-auth.guard";
import { SupabaseAuthGuard } from "../../../auth/supabase-auth.guard";
import { ZodValidationPipe } from "../../../common/zod-validation.pipe";
import { CodeToDiagramService } from "../../../service/code-to-diagram.service";
import {
  CodeToDiagramRequestSchema,
  type CodeToDiagramRequest,
} from "../request/code-to-diagram.request";
import type { CodeToDiagramDto } from "../response/code-to-diagram.response";

/**
 * POST /v1/canvases/from-code
 *
 * Stateless. Reads a code snippet, returns a generated DSL string. The
 * client decides whether to write the DSL into an existing canvas, open
 * a preview, or discard. We persist nothing here — the canvas (and its
 * DSL once saved) is the source of truth, this endpoint is just a
 * Claude call wrapped in auth.
 */
@Controller("canvases")
@UseGuards(SupabaseAuthGuard)
export class CodeToDiagramController {
  constructor(private readonly service: CodeToDiagramService) {}

  @Post("from-code")
  async fromCode(
    @Body(new ZodValidationPipe(CodeToDiagramRequestSchema)) body: CodeToDiagramRequest,
    @Req() _req: AuthenticatedRequest,
  ): Promise<CodeToDiagramDto> {
    const out = await this.service.generate({
      code: body.code,
      ...(body.hint ? { hint: body.hint } : {}),
      ...(body.currentDsl ? { currentDsl: body.currentDsl } : {}),
    });
    return { dsl: out.dsl, detectedKind: out.detectedKind };
  }
}
