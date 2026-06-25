import type { meetings } from "../db/schemas/meetings";
import type { CreatorSummary, Visibility } from "./project.model";

/** Plain model — never includes the audio bytea blob. */
export interface Meeting {
  id: string;
  workspaceId: string;
  createdByUserId: string;
  title: string;
  description: string | null;
  transcript: string;
  summary: string;
  hasAudio: boolean;
  audioContentType: string | null;
  audioDurationSec: number | null;
  audioSizeBytes: number | null;
  audioUploadedAt: Date | null;
  publicSlug: string | null;
  visibility: Visibility;
  publishedAt: Date | null;
  lastPublishedAt: Date | null;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  /** Set by list endpoints (joined from users + COUNT(resource_shares)). */
  creator?: CreatorSummary | null;
  sharedCount?: number;
}

type MeetingRowNoAudio = Omit<typeof meetings.$inferSelect, "audioContent">;

export function toMeeting(
  row: MeetingRowNoAudio & {
    creator?: CreatorSummary | null;
    sharedCount?: number;
  },
): Meeting {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    createdByUserId: row.createdByUserId,
    title: row.title,
    description: row.description,
    transcript: row.transcript,
    summary: row.summary,
    hasAudio: row.audioUploadedAt !== null,
    audioContentType: row.audioContentType,
    audioDurationSec: row.audioDurationSec,
    audioSizeBytes: row.audioSizeBytes,
    audioUploadedAt: row.audioUploadedAt,
    publicSlug: row.publicSlug,
    visibility: row.visibility,
    publishedAt: row.publishedAt,
    lastPublishedAt: row.lastPublishedAt,
    settings: (row.settings as Record<string, unknown>) ?? {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    ...(row.creator !== undefined ? { creator: row.creator } : {}),
    ...(row.sharedCount !== undefined ? { sharedCount: row.sharedCount } : {}),
  };
}
