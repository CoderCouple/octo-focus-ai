import { Body, Controller, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { ServerResponse } from "node:http";
import type { AuthenticatedRequest } from "../../../auth/supabase-auth.guard";
import { SupabaseAuthGuard } from "../../../auth/supabase-auth.guard";
import { SkipResponseInterceptor } from "../../../common/interceptor/skip-response-interceptor.decorator";
import { ZodValidationPipe } from "../../../common/zod-validation.pipe";
import {
  CodeToDiagramService,
  detectKindFromHint,
  stripFencesFromBuffer,
} from "../../../service/code-to-diagram.service";
import {
  CodeToDiagramRequestSchema,
  type CodeToDiagramRequest,
} from "../request/code-to-diagram.request";
import type { CodeToDiagramDto } from "../response/code-to-diagram.response";

/**
 * POST /v1/canvases/from-code        — batch (returns full DSL)
 * POST /v1/canvases/from-code/stream — SSE (yields token deltas)
 *
 * Stateless. The client decides whether to write the result into an
 * existing canvas, open a preview, or discard. We persist nothing here.
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

  /**
   * Streaming variant — Server-Sent Events shape:
   *
   *   data: {"chunk": "<text>"}\n\n           — repeated per delta
   *   data: {"done": true, "dsl": "<full>", "detectedKind": "..."}\n\n
   *   data: {"error": "<message>"}\n\n        — on failure (single)
   *
   * The browser shows chunks as they land (typewriter effect) and the
   * final "done" frame supplies the cleaned, fence-stripped DSL ready to
   * commit to the canvas.
   */
  @Post("from-code/stream")
  @SkipResponseInterceptor()
  async fromCodeStream(
    @Body(new ZodValidationPipe(CodeToDiagramRequestSchema)) body: CodeToDiagramRequest,
    @Res() reply: { raw: ServerResponse },
  ): Promise<void> {
    const raw = reply.raw;
    raw.setHeader("Content-Type", "text/event-stream");
    raw.setHeader("Cache-Control", "no-cache, no-transform");
    raw.setHeader("Connection", "keep-alive");
    raw.flushHeaders?.();

    const send = (payload: Record<string, unknown>) => {
      raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    let buffered = "";
    try {
      for await (const chunk of this.service.generateStream({
        code: body.code,
        ...(body.hint ? { hint: body.hint } : {}),
        ...(body.currentDsl ? { currentDsl: body.currentDsl } : {}),
      })) {
        buffered += chunk;
        send({ chunk });
      }
      const dsl = stripFencesFromBuffer(buffered);
      send({ done: true, dsl, detectedKind: detectKindFromHint(body.hint) });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      send({ error: message });
    } finally {
      raw.end();
    }
  }
}
