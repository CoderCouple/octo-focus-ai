import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import type { AuthenticatedRequest } from "../../../auth/supabase-auth.guard";
import { SupabaseAuthGuard } from "../../../auth/supabase-auth.guard";
import { ZodValidationPipe } from "../../../common/zod-validation.pipe";
import { RefineDiagramService } from "../../../service/refine-diagram.service";
import {
  RefineDiagramRequestSchema,
  type RefineDiagramRequest,
} from "../request/refine-diagram.request";
import type { RefineDiagramDto } from "../response/refine-diagram.response";

/**
 * POST /v1/canvases/refine-diagram
 *
 * Stateless. Takes a current DSL + an instruction, returns a modified DSL.
 * Mirrors the from-code endpoint's pattern — no persistence; the client
 * decides whether to write the result into the canvas.
 */
@Controller("canvases")
@UseGuards(SupabaseAuthGuard)
export class RefineDiagramController {
  constructor(private readonly service: RefineDiagramService) {}

  @Post("refine-diagram")
  async refine(
    @Body(new ZodValidationPipe(RefineDiagramRequestSchema)) body: RefineDiagramRequest,
    @Req() _req: AuthenticatedRequest,
  ): Promise<RefineDiagramDto> {
    const out = await this.service.refine({
      currentDsl: body.currentDsl,
      instruction: body.instruction,
      ...(body.hint ? { hint: body.hint } : {}),
    });
    return { dsl: out.dsl };
  }
}
