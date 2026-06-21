import { z } from "zod";

export {
  AiRunCreateSchema,
  AiRunUpdateSchema,
  type AiRunCreate,
  type AiRunUpdate,
  type AiRunStatus,
} from "@octofocus/shared";

export const AiRunListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type AiRunListQuery = z.infer<typeof AiRunListQuerySchema>;
