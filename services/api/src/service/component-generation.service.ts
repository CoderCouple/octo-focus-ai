/**
 * Generative-UI component synthesis. Asks Claude to emit a single
 * self-contained React / TypeScript functional component that the user
 * can drop into any modern React app. The component is expected to be
 * interactive (state, inputs, visualisation, etc.) and styled with
 * Tailwind CSS so it fits the OctoFocusAI design system.
 *
 * Inspired by CopilotKit's AG-UI / A2UI protocols: the agent generates
 * a UI surface from a natural-language prompt and the host app renders
 * it. We persist nothing here — every prompt produces a fresh
 * component; the user decides whether to copy/keep it.
 */
import { Injectable } from "@nestjs/common";
import { LlmService } from "../common/llm.service";

export interface GenerateComponentInput {
  prompt: string;
  /** Optional previous component code to refine instead of starting fresh. */
  currentCode?: string;
}

export interface GenerateComponentOutput {
  code: string;
  language: "tsx";
}

const SYSTEM_PROMPT = `You are a senior React + TypeScript engineer who produces interactive, visually polished UI artifacts on demand.

Your job: read the user's natural-language description and emit ONE self-contained React component that renders well IMMEDIATELY in a live preview.

Output:
- ONLY the component source code, wrapped in a single fenced \`\`\`tsx code block. No prose before or after.
- Use a default export named after the component (e.g. \`export default function FlightTracker() { ... }\`).
- TypeScript, functional component, React hooks. No class components.

Rendering environment (very important):
- The component renders inside a sandboxed iframe — a CLEAN ROOM, NOT inside another app's layout. It owns the full viewport.
- Tailwind CSS Play CDN is preloaded. EVERY standard Tailwind class works: every color, every shade, every variant (hover/focus/active/disabled/dark), gradients, shadows, blur, ring, scale, rotate, animate, backdrop-blur — all of it.
- The iframe's body has no margin and the root fills the viewport. A typical wrapper like \`<div className="min-h-screen ...">\` is the right starting point — own the whole space, set your own background (dark / gradient / branded), set your own padding, your own max-width.
- Viewport units (\`h-screen\`, \`min-h-screen\`, \`w-screen\`), fixed positioning, dark backgrounds, full-bleed gradients all work cleanly. Use them when they make the artifact feel like a real product.

Style + interaction:
- Use color FREELY. Gradients, semantic accents, dark mode, bold typography. Make the artifact look like a polished mini-product (Linear / Stripe / Vercel level of finish).
- Make it INTERACTIVE: state, controlled inputs, computed feedback, smooth transitions. Static markup is rarely the right answer.
- Thoughtful spacing, hierarchy, rounded corners, shadows, focus states. Real product, not a coding-test snippet.

Constraints:
- Self-contained: only \`react\` is available. No icon libraries, no chart libraries, no fetch to external APIs. Inline SVG when you need an icon. Inline math when you need plotting (canvas/svg work, recharts does not).
- Keep components under ~300 lines. If the request is too broad, pick the most useful slice and ship that.
- No placeholder TODO comments. Ship working code.

If the user provides previous code (refine mode), apply their new request to that code instead of rewriting from scratch. Preserve the working parts.`;

@Injectable()
export class ComponentGenerationService {
  constructor(private readonly llm: LlmService) {}

  async generate(input: GenerateComponentInput): Promise<GenerateComponentOutput> {
    let buffered = "";
    for await (const chunk of this.generateStream(input)) {
      buffered += chunk;
    }
    return { code: stripFencesFromBuffer(buffered), language: "tsx" };
  }

  async *generateStream(input: GenerateComponentInput): AsyncGenerator<string, void, void> {
    const user = input.currentCode
      ? `Existing component (refine this — apply the change, return the new full code):\n\n\`\`\`tsx\n${input.currentCode}\n\`\`\`\n\nChange request: ${input.prompt}`
      : input.prompt;

    yield* this.llm.streamText({
      system: SYSTEM_PROMPT,
      user,
      options: { maxTokens: 4000, temperature: 0.4 },
    });
  }
}

/**
 * Trim the model's fenced block (` ```tsx ... ``` `) down to raw code,
 * tolerating models that drop the language tag or skip the opening fence.
 */
export function stripFencesFromBuffer(buffered: string): string {
  const trimmed = buffered.trim();
  const match = trimmed.match(/```(?:tsx|typescript|jsx|javascript|ts|js)?\n?([\s\S]*?)```/);
  if (match) return match[1].trim();
  return trimmed;
}
