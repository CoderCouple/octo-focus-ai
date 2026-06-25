import type { CreatorSummary, Visibility } from "@octofocus/shared";

export type { CreatorSummary, Visibility };

/** Full meeting payload. Never includes the audio bytea — only metadata. */
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
  audioUploadedAt: string | null;
  publicSlug: string | null;
  visibility: Visibility;
  publishedAt: string | null;
  lastPublishedAt: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  creator?: CreatorSummary | null;
  sharedCount?: number;
}

export interface WorkspaceMeetingSummary {
  id: string;
  title: string;
  description: string | null;
  hasAudio: boolean;
  audioDurationSec: number | null;
  visibility: Visibility;
  publicSlug: string | null;
  createdAt: string;
  updatedAt: string;
  creator: CreatorSummary | null;
  sharedCount: number;
}

export interface MeetingCreate {
  title?: string;
  description?: string | null;
}

export interface MeetingUpdate {
  title?: string;
  description?: string | null;
  transcript?: string;
  summary?: string;
}
