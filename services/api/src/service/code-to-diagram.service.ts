/**
 * Code → diagram DSL. Asks Claude to read a code snippet (any common
 * source type: docker-compose, terraform, package.json, OpenAPI / SQL /
 * Prisma / Drizzle schema, or raw TypeScript / Python) and emit the
 * thin OctoFocusAI DSL we already parse via `@octofocus/diagrams`.
 *
 * The DSL v2 (see packages/diagrams/DSL.md) is still a draft; until the
 * parser catches up we target the current v1 grammar:
 *
 *   # comments
 *   Node Name              -> declares a node
 *   A > B                  -> directed edge
 *   A > B: label           -> labeled edge
 *
 * The returned DSL is fed straight into the existing DSL drawer on the
 * canvas — no new rendering pipeline.
 *
 * Input code is NOT persisted. We mirror Eraser's pattern: code goes in,
 * diagram comes out; if the user wants to iterate they paste again. The
 * canvas itself (and its DSL) is the only thing that ends up in the DB.
 */
import { Injectable } from "@nestjs/common";
import { LlmService } from "../common/llm.service";

export type CodeToDiagramHint =
  | "auto"
  | "architecture"
  | "sequence"
  | "er"
  | "flowchart";

export interface CodeToDiagramInput {
  code: string;
  hint?: CodeToDiagramHint;
  /** if set, the model is asked to refine an existing DSL instead of generating from scratch */
  currentDsl?: string;
}

export interface CodeToDiagramOutput {
  dsl: string;
  detectedKind: "architecture" | "sequence" | "er" | "flowchart";
}

const SYSTEM_PROMPT = `You are a senior software architect who translates source code into clean architecture diagrams.

You will be given a snippet of code (docker-compose, terraform, a package manifest, an OpenAPI spec, SQL DDL, a Prisma/Drizzle schema, or raw TypeScript / Python / Go) and you must emit an OctoFocusAI DSL diagram that visualises its structure.

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

# Groups — a name followed by { … } makes a labeled container.
# Render as a dashed box framing the children.
AWS [icon: aws] {
  Lambda [icon: aws-lambda]
  RDS [icon: aws-rds]
  S3 [icon: aws-s3]
}
# Groups can nest:
VPC [icon: cloud] {
  PublicSubnet {
    Bastion [icon: aws-ec2]
  }
  PrivateSubnet {
    AppServer [icon: aws-ec2]
    Database [icon: aws-rds]
  }
}
# Edges can target nodes inside groups — reference by name:
Web > Lambda
\`\`\`

Node attributes (all optional):
  - icon: icon name (see list below)
  - color: red, orange, yellow, green, blue, violet, light-blue, light-green, grey, black
  - shape: rectangle (default), oval, ellipse, diamond, hexagon
  - label: alternate display label

Icon names (the renderer maps these to inline glyphs — unknown icons render as a plain box):
  - cloud/infra: server, database, cloud, cache, queue, monitor, container
  - AWS: aws-ec2, aws-lambda, aws-s3, aws-rds, aws-dynamodb, aws-api-gateway, aws-sqs, aws-sns, aws-cloudfront, aws-iam, aws-route53, aws-eks, aws-ecs
  - GCP: gcp-functions, gcp-storage, gcp-bigquery, gcp-pubsub, gcp-gke
  - Azure: azure-vm, azure-functions, azure-storage, azure-sql
  - Kubernetes: kubernetes, k8s-control-plane, k8s-node, k8s-etcd, k8s-kubelet
  - Data: postgres, mysql, redis, mongodb, kafka, rabbitmq, elasticsearch
  - SaaS: github, gitlab, slack, stripe, auth0, supabase, vercel, netlify, cloudflare, docker, nginx
  - People/clients: user, users, admin, developer, client, browser, mobile
  - Generic: shield, key, lock, mail, bell, bug, zap, gear, brain, sparkles, flag, package, folder

Rules:
- One declaration or edge per line.
- ALWAYS add a relevant icon when the code names a known service (S3, Lambda, Postgres, etc.). The icons are what make the diagram readable at a glance — without them it's just rectangles.
- WRAP cloud resources in their provider group. If the code is AWS-flavored, put EC2/Lambda/RDS/S3 inside an \`AWS { ... }\` group. Same for GCP, Azure, Kubernetes. Visually-grouped clusters read 10× better than 8 floating icons.
- Use fan-out (\`API > Lambda, Worker, Cache\`) when one service hands off to multiple downstreams in parallel — it's both shorter and more visually accurate.
- Reach for color sparingly and only when it carries meaning: orange for external/third-party services, green for success paths, red for danger / write paths, blue or violet for internal services.
- Quote names that contain spaces or special characters with double quotes.
- Node names referenced in an edge are auto-declared.
- Keep names short and human-readable (no IDs, no UUIDs, no file paths).
- Prefer 6-15 nodes total. Aim for clarity over completeness.
- Match wording across related items (e.g. "Auth Service", "Auth DB").

Return only the DSL — no markdown fences, no commentary, no preamble. The first line of your output must be either a comment or a node/edge declaration.`;

@Injectable()
export class CodeToDiagramService {
  constructor(private readonly llm: LlmService) {}

  async generate(input: CodeToDiagramInput): Promise<CodeToDiagramOutput> {
    const userPrompt = buildUserPrompt(input);
    const raw = await this.llm.completeText({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      options: { temperature: 0.2, maxTokens: 1500 },
    });

    const dsl = stripFences(raw);
    const detectedKind = detectKind(input.hint, dsl);
    return { dsl, detectedKind };
  }
}

function buildUserPrompt(input: CodeToDiagramInput): string {
  const parts: string[] = [];
  if (input.hint && input.hint !== "auto") {
    parts.push(`The user wants a ${input.hint} diagram. Bias your output toward that style.`);
  } else {
    parts.push(
      "Choose the most natural diagram style for this code (architecture, sequence, er, or flowchart).",
    );
  }

  if (input.currentDsl && input.currentDsl.trim().length > 0) {
    parts.push(
      "There is an existing DSL the user has been editing. Refine it to match the code rather than starting from scratch. Keep the same node names where possible.",
    );
    parts.push(`Existing DSL:\n\`\`\`\n${input.currentDsl.trim()}\n\`\`\``);
  }

  parts.push("Source code:");
  parts.push("```");
  parts.push(input.code.trim());
  parts.push("```");
  parts.push("");
  parts.push("Output the DSL now.");
  return parts.join("\n");
}

/**
 * Models sometimes wrap their output in a ``` fence despite instructions.
 * Strip a single leading/trailing fenced block if present.
 */
function stripFences(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:[a-zA-Z]+)?\n([\s\S]*?)\n```$/);
  if (fenceMatch) return fenceMatch[1]!.trim();
  return trimmed;
}

function detectKind(
  hint: CodeToDiagramHint | undefined,
  _dsl: string,
): CodeToDiagramOutput["detectedKind"] {
  if (hint && hint !== "auto") return hint;
  // The thin DSL doesn't expose enough structure to detect kind reliably;
  // default to architecture which is the canvas's default style.
  return "architecture";
}
