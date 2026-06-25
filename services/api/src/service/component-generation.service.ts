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

const SYSTEM_PROMPT = `You are a senior React + TypeScript engineer who produces small, focused, interactive, visually polished UI components on demand.

Your job: read the user's natural-language description and emit ONE self-contained React component that renders well IMMEDIATELY in a live preview.

Constraints:
- Output ONLY the component source code, wrapped in a single fenced \`\`\`tsx code block. No prose before or after.
- Use a default export named after the component (e.g. \`export default function FlightTracker() { ... }\`).
- TypeScript + functional component + React hooks. No class components.
- Style with Tailwind CSS utility classes. No external CSS files, no styled-components.
- The component MUST be self-contained: no imports beyond \`react\` and basic browser primitives. Do NOT use icon libraries, charting libraries, or any project-specific imports — write inline SVG when you need an icon.
- Use color FREELY when it helps the design — gradients, semantic accents, dark backgrounds, bold typography. The component renders inside a neutral host shell; treat it as its own surface and make it look polished. (Use Tailwind classes: \`bg-orange-500\`, \`from-indigo-500\`, etc.)
- Make it INTERACTIVE: state, controlled inputs, clickable affordances, computed feedback, smooth transitions where they help.
- Make it look REAL: thoughtful spacing, hierarchy, rounded corners, shadows, focus states. A static prototype mock-up of a real product, not a coding-test snippet.
- Keep components focused — under ~250 lines. If the request is too broad, pick the most useful slice and ship that.
- Do NOT include placeholder TODO comments. Ship working code.

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
