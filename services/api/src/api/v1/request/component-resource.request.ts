import { z } from "zod";

export const ComponentResourceCreateSchema = z.object({
  title: z.string().trim().min(1).max(200).default("Untitled component"),
  description: z.string().trim().max(2000).optional().nullable(),
  code: z.string().min(1).max(200_000),
  language: z.enum(["html", "tsx"]).default("html"),
});
export type ComponentResourceCreate = z.infer<typeof ComponentResourceCreateSchema>;

export const ComponentResourceUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  code: z.string().min(1).max(200_000).optional(),
  language: z.enum(["html", "tsx"]).optional(),
});
export type ComponentResourceUpdate = z.infer<typeof ComponentResourceUpdateSchema>;
