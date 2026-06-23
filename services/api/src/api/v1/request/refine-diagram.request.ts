import { z } from "zod";

const MAX_DSL_CHARS = 32_000;
const MAX_INSTRUCTION_CHARS = 4_000;

export const RefineDiagramHintSchema = z.enum([
  "auto",
  "architecture",
  "sequence",
  "er",
  "flowchart",
]);
export type RefineDiagramHint = z.infer<typeof RefineDiagramHintSchema>;

export const RefineDiagramRequestSchema = z.object({
  currentDsl: z.string().trim().min(1, "currentDsl is required").max(MAX_DSL_CHARS),
  instruction: z
    .string()
    .trim()
    .min(1, "instruction is required")
    .max(MAX_INSTRUCTION_CHARS),
  hint: RefineDiagramHintSchema.optional(),
});
export type RefineDiagramRequest = z.infer<typeof RefineDiagramRequestSchema>;
