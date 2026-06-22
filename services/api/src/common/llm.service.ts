/**
 * Thin LLM wrapper. v1 talks to Anthropic Claude directly via the official
 * SDK — no router, no abstractions beyond what the SDK provides. When we
 * grow a second provider (OpenAI for TTS, or a router for fallback), the
 * swap point is `client.messages.create` here, and the public methods
 * (`completeJson`, `completeText`) stay stable.
 *
 * `ANTHROPIC_API_KEY` is read from process.env at construction time. If
 * absent, the service throws on first call — we don't fail boot, since
 * other services may want to run without LLM access in dev.
 */
import { Injectable, Logger } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-7";
const DEFAULT_MAX_TOKENS = 4096;

export interface CompletionOptions {
  /** override the default model */
  model?: string;
  /** override the default max output tokens */
  maxTokens?: number;
  /** temperature; defaults to 0 for deterministic structured output */
  temperature?: number;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private clientCache: Anthropic | null = null;

  private client(): Anthropic {
    if (this.clientCache) return this.clientCache;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Set it in the api env (Railway / .env) to enable AI features.",
      );
    }
    this.clientCache = new Anthropic({ apiKey });
    return this.clientCache;
  }

  /**
   * Run a single completion against Claude. Returns the assistant's
   * concatenated text content. Tool use, streaming, and multi-turn are
   * out of scope here — call sites that need them should reach into the
   * SDK directly via `this.client()`.
   */
  async completeText(opts: {
    system: string;
    user: string;
    options?: CompletionOptions;
  }): Promise<string> {
    const { system, user, options } = opts;
    const res = await this.client().messages.create({
      model: options?.model ?? DEFAULT_MODEL,
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: options?.temperature ?? 0,
      system,
      messages: [{ role: "user", content: user }],
    });
    let out = "";
    for (const block of res.content) {
      if (block.type === "text") out += block.text;
    }
    if (!out) {
      this.logger.warn("Claude returned no text content");
    }
    return out.trim();
  }
}
