import { z } from "zod";

export const ComponentGenerationRequestSchema = z.object({
  prompt: z.string().trim().min(3).max(4000),
  /** Existing TSX to refine instead of generating from scratch. */
  currentCode: z.string().max(50000).optional(),
});

export type ComponentGenerationRequest = z.infer<typeof ComponentGenerationRequestSchema>;
