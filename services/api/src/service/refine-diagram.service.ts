/**
 * Refine an existing OctoFocusAI DSL diagram via a natural-language
 * instruction. Stateless, mirrors `code-to-diagram.service.ts`:
 *
 *   POST { currentDsl, instruction } → { dsl }
 *
 * Typical instructions:
 *   - "Add a CloudFront CDN in front of the S3 bucket"
 *   - "Replace Redis with Memcached"
 *   - "Show only the auth flow"
 *   - "Group the cloud resources under AWS"
 *   - "Make the API → DB connection async"
 *
 * Claude is told to PRESERVE node names and structure where the
 * instruction doesn't change them, so that the output reads as a
 * diff of the input, not a fresh rebuild.
 */
import { Injectable } from "@nestjs/common";
import { LlmService } from "../common/llm.service";

export type RefineDiagramHint =
  | "auto"
  | "architecture"
  | "sequence"
  | "er"
  | "flowchart";

export interface RefineDiagramInput {
  currentDsl: string;
  instruction: string;
  hint?: RefineDiagramHint;
}

export interface RefineDiagramOutput {
  dsl: string;
}

const SYSTEM_PROMPT = `You are a senior software architect helping a user iterate on an existing diagram-as-code description.

The user will provide:
  1. The current OctoFocusAI DSL describing their diagram.
  2. A natural-language instruction for what they want to change.

You must emit a NEW DSL that applies the instruction to the current diagram.

OctoFocusAI DSL grammar (current v1):

\`\`\`
# comments start with a hash
Web Client                                    # bare node
"API Gateway"                                 # quoted names allow spaces
Lambda [icon: aws-lambda]                     # node with attributes
"Auth Service" [icon: shield, color: orange]
API Gateway > Auth Service                    # directed edge
API Gateway > Auth Service: validates         # edge with label
Web Client > API Gateway [color: green]       # edge with attribute
API > Lambda, Worker, Cache                   # fan-out: one edge per target
Producer --> Queue                            # dashed arrow (async)
Worker <> Cache                               # bidirectional
Web - "Load Balancer"                         # plain line, no arrowhead
A > B > C                                     # chained: emits A→B and B→C

# Diagram-level direction
direction down                                # down | up | right | left

# Groups
AWS [icon: aws] {
  Lambda [icon: aws-lambda]
  RDS [icon: aws-rds]
}
\`\`\`

Node attributes: icon, color (red/orange/yellow/green/blue/violet/light-blue/light-green/grey/black), shape (rectangle/oval/ellipse/diamond/hexagon), label.

Rules:
- PRESERVE node names and structure that the instruction doesn't ask you to change. The user is iterating, not starting over.
- KEEP existing icons and colors unless the instruction asks otherwise. Only add new attributes to new nodes or where the instruction implies a style change.
- Apply the instruction minimally — make the smallest reasonable change that satisfies it.
- If the instruction is ambiguous, prefer the interpretation that produces the most useful architecture diagram for a technical reader.
- Reach for icons on any new nodes (especially AWS/GCP/Azure/SaaS services).
- Use the arrow style that fits: \`>\` for sync calls, \`-->\` for async, \`<>\` for symmetric, \`-\` for annotation.

Return only the new DSL — no markdown fences, no commentary, no preamble. The first line of your output must be either a comment, a directive, or a node/edge declaration.`;

@Injectable()
export class RefineDiagramService {
  constructor(private readonly llm: LlmService) {}

  async refine(input: RefineDiagramInput): Promise<RefineDiagramOutput> {
    const userPrompt = buildUserPrompt(input);
    const raw = await this.llm.completeText({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      options: { temperature: 0.2, maxTokens: 2000 },
    });
    return { dsl: stripFences(raw) };
  }
}

function buildUserPrompt(input: RefineDiagramInput): string {
  const parts: string[] = [];
  if (input.hint && input.hint !== "auto") {
    parts.push(`Preferred diagram style: ${input.hint}.`);
  }
  parts.push("Current DSL:");
  parts.push("```");
  parts.push(input.currentDsl.trim());
  parts.push("```");
  parts.push("");
  parts.push(`Instruction: ${input.instruction.trim()}`);
  parts.push("");
  parts.push("Output the modified DSL now.");
  return parts.join("\n");
}

function stripFences(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:[a-zA-Z]+)?\n([\s\S]*?)\n```$/);
  if (fenceMatch) return fenceMatch[1]!.trim();
  return trimmed;
}
