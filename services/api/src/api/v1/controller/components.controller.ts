import { Body, Controller, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AuthenticatedRequest } from "../../../auth/supabase-auth.guard";
import { SupabaseAuthGuard } from "../../../auth/supabase-auth.guard";
import { SkipResponseInterceptor } from "../../../common/interceptor/skip-response-interceptor.decorator";
import { ZodValidationPipe } from "../../../common/zod-validation.pipe";
import {
  ComponentGenerationService,
  stripFencesFromBuffer,
} from "../../../service/component-generation.service";
import {
  ComponentGenerationRequestSchema,
  type ComponentGenerationRequest,
} from "../request/component-generation.request";
import type { ComponentGenerationDto } from "../response/component-generation.response";

/**
 * POST /v1/components/generate        — batch (returns full TSX)
 * POST /v1/components/generate/stream — SSE (yields token deltas)
 *
 * Stateless — nothing is persisted. The client decides what to do with
 * the generated component (copy, drop in a project, discard).
 */
@Controller("components")
@UseGuards(SupabaseAuthGuard)
export class ComponentsController {
  constructor(private readonly service: ComponentGenerationService) {}

  @Post("generate")
  async generate(
    @Body(new ZodValidationPipe(ComponentGenerationRequestSchema))
    body: ComponentGenerationRequest,
    @Req() _req: AuthenticatedRequest,
  ): Promise<ComponentGenerationDto> {
    const out = await this.service.generate({
      prompt: body.prompt,
      ...(body.currentCode ? { currentCode: body.currentCode } : {}),
    });
    return { code: out.code, language: out.language };
  }

  /**
   * SSE shape — identical to /canvases/from-code/stream:
   *   data: {"chunk": "<text>"}\n\n           — repeated per delta
   *   data: {"done": true, "code": "<full>", "language": "tsx"}\n\n
   *   data: {"error": "<message>"}\n\n        — on failure (single)
   */
  @Post("generate/stream")
  @SkipResponseInterceptor()
  async generateStream(
    @Body(new ZodValidationPipe(ComponentGenerationRequestSchema))
    body: ComponentGenerationRequest,
    @Req() request: AuthenticatedRequest & { raw: IncomingMessage },
    @Res() reply: { raw: ServerResponse },
  ): Promise<void> {
    const raw = reply.raw;

    // Manual CORS — writing to reply.raw bypasses Fastify's reply pipeline.
    const origin = request.raw.headers.origin ?? process.env.WEB_ORIGIN ?? "*";
    raw.setHeader("Access-Control-Allow-Origin", origin);
    raw.setHeader("Access-Control-Allow-Credentials", "true");
    raw.setHeader("Vary", "Origin");

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
        prompt: body.prompt,
        ...(body.currentCode ? { currentCode: body.currentCode } : {}),
      })) {
        buffered += chunk;
        send({ chunk });
      }
      const code = stripFencesFromBuffer(buffered);
      send({ done: true, code, language: "tsx" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      send({ error: message });
    } finally {
      raw.end();
    }
  }
}
