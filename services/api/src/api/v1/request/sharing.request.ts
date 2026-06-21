import { z } from "zod";
import { ResourceKindSchema } from "@octofocus/shared";

export {
  ResourceShareCreateSchema,
  ResourceShareUpdateSchema,
  ShareLinkCreateSchema,
  type ResourceShareCreate,
  type ResourceShareUpdate,
  type ShareLinkCreate,
} from "@octofocus/shared";

export const ShareListQuerySchema = z.object({
  kind: ResourceKindSchema,
  id: z.string().min(1).max(64),
});

export type ShareListQuery = z.infer<typeof ShareListQuerySchema>;

export const ShareAcceptBodySchema = z.object({
  shareId: z.string().min(1).max(64),
});

export type ShareAcceptBody = z.infer<typeof ShareAcceptBodySchema>;

export const PublicShareTokenBodySchema = z.object({
  password: z.string().min(1).max(200).optional(),
});

export type PublicShareTokenBody = z.infer<typeof PublicShareTokenBodySchema>;
