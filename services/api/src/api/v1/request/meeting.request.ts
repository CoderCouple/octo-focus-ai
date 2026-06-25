import { z } from "zod";

export const MeetingCreateSchema = z.object({
  title: z.string().trim().min(1).max(200).default("Untitled meeting"),
  description: z.string().trim().max(2000).optional().nullable(),
});
export type MeetingCreate = z.infer<typeof MeetingCreateSchema>;

export const MeetingUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  transcript: z.string().max(500000).optional(),
  summary: z.string().max(50000).optional(),
});
export type MeetingUpdate = z.infer<typeof MeetingUpdateSchema>;
