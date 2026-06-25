/**
 * Generative-UI artifact synthesis. Asks Claude to emit a single
 * self-contained HTML document — same shape Claude.ai's artifact
 * panel ships: a complete `.html` file with inline `<style>` and
 * inline `<script>`, no external CDNs, no React, no Tailwind. Just
 * vanilla CSS + JS.
 *
 * The renderer side drops the HTML directly into an iframe's `srcDoc`
 * — no Babel, no module loader. The artifact owns its full viewport
 * and looks like a polished mini-product.
 *
 * Stateless. Every prompt produces a fresh artifact; the user decides
 * whether to copy/embed it.
 */
import { Injectable } from "@nestjs/common";
import { LlmService } from "../common/llm.service";

export interface GenerateComponentInput {
  prompt: string;
  /** Optional previous HTML to refine instead of starting fresh. */
  currentCode?: string;
}

export interface GenerateComponentOutput {
  code: string;
  language: "html";
}

const SYSTEM_PROMPT = `You are a senior front-end engineer who produces interactive, visually polished, self-contained HTML artifacts on demand. Same shape Claude.ai's artifact panel emits — a single \`.html\` file you could double-click and open in a browser.

Your job: read the user's natural-language description and emit ONE complete HTML document that renders well IMMEDIATELY in a live preview.

Output:
- ONLY the HTML document, wrapped in a single fenced \`\`\`html code block. No prose before or after.
- Start with \`<!DOCTYPE html>\` and include \`<html>\`, \`<head>\`, \`<body>\`. A \`<title>\` is required.
- Inline CSS in a \`<style>\` block. Inline JS in a \`<script>\` block. NO external stylesheets, NO external scripts, NO CDNs, NO Google Fonts — fully self-contained.

Style:
- Use CSS custom properties for a small, opinionated palette. Pick colors that fit the subject (dark themes for focus / data / dev tools; bright themes for marketing / fun / kids; muted tones for productivity).
- The artifact OWNS THE VIEWPORT. Use \`min-height: 100vh\` on body. Set your own background. Pick a thoughtful max-width (~640-960px for centered cards, full width for dashboards). Don't render in a tiny box.
- Modern CSS only: flexbox, grid, \`gap\`, custom properties, \`@media (prefers-reduced-motion)\`. Smooth transitions where they help. Subtle shadows, rounded corners (8-20px), thoughtful spacing.
- Typography: system font stack (\`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif\`). Real hierarchy — clear headings, comfortable line-height (1.5-1.6 for body), tabular nums for numbers.
- SVG icons inline. Emoji where it actually helps. No Font Awesome.

Interaction:
- Vanilla JS — no React, no Vue, no jQuery. Modern JS is fine (\`const\`, \`let\`, arrow funcs, template literals, optional chaining).
- Add real state and behaviour. Inputs that respond, animations that play, computed feedback that updates as you type. Static markup is rarely the right answer.
- Keyboard accessibility where it matters (Enter on buttons, Esc to close modals, arrow keys for sliders).
- Handle edge cases inline: empty states, loading shimmer, error tones — not "todo" comments.

Make it feel like a real product:
- Output should be something you could screenshot and have it look indistinguishable from a published app screenshot. Not a coding-test mockup.
- Linear / Stripe / Vercel / Notion / Apple — pick the aesthetic that matches the request and commit to it.
- ~150-400 lines is the right size. Bigger is fine when the subject demands it; smaller is fine when it's tight.

If the user provides previous code (refine mode), apply their change to that code and return the new complete document. Preserve the working parts.`;

@Injectable()
export class ComponentGenerationService {
  constructor(private readonly llm: LlmService) {}

  async generate(input: GenerateComponentInput): Promise<GenerateComponentOutput> {
    let buffered = "";
    for await (const chunk of this.generateStream(input)) {
      buffered += chunk;
    }
    return { code: stripFencesFromBuffer(buffered), language: "html" };
  }

  async *generateStream(input: GenerateComponentInput): AsyncGenerator<string, void, void> {
    const user = input.currentCode
      ? `Existing artifact (refine this — apply the change, return the new full HTML):\n\n\`\`\`html\n${input.currentCode}\n\`\`\`\n\nChange request: ${input.prompt}`
      : input.prompt;

    yield* this.llm.streamText({
      system: SYSTEM_PROMPT,
      user,
      options: { maxTokens: 6000, temperature: 0.5 },
    });
  }
}

/**
 * Trim the model's fenced block down to raw code, tolerating models
 * that drop the language tag or skip the opening fence.
 */
export function stripFencesFromBuffer(buffered: string): string {
  const trimmed = buffered.trim();
  const match = trimmed.match(
    /```(?:html|htm|tsx|typescript|jsx|javascript|ts|js)?\n?([\s\S]*?)```/,
  );
  if (match) return match[1].trim();
  return trimmed;
}
