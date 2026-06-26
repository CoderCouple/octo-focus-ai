import { z } from "zod";

export const FigureResourceCreateSchema = z.object({
  title: z.string().trim().min(1).max(200).default("Untitled figure"),
  description: z.string().trim().max(2000).optional().nullable(),
  dsl: z.string().min(1).max(200_000),
});
export type FigureResourceCreate = z.infer<typeof FigureResourceCreateSchema>;

export const FigureResourceUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  dsl: z.string().min(1).max(200_000).optional(),
});
export type FigureResourceUpdate = z.infer<typeof FigureResourceUpdateSchema>;
