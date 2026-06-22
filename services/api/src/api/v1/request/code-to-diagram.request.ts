import { z } from "zod";

const MAX_INPUT_CHARS = 32_000;

export const CodeToDiagramHintSchema = z.enum([
  "auto",
  "architecture",
  "sequence",
  "er",
  "flowchart",
]);
export type CodeToDiagramHint = z.infer<typeof CodeToDiagramHintSchema>;

export const CodeToDiagramRequestSchema = z.object({
  code: z.string().trim().min(1, "code is required").max(MAX_INPUT_CHARS),
  hint: CodeToDiagramHintSchema.optional(),
  currentDsl: z.string().max(MAX_INPUT_CHARS).optional(),
});
export type CodeToDiagramRequest = z.infer<typeof CodeToDiagramRequestSchema>;
