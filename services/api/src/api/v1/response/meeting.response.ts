import type { Meeting } from "../../../model/meeting.model";
import type { Visibility } from "../../../model/project.model";

export interface MeetingDto {
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
  creator?: { id: string; name: string; email: string } | null;
  sharedCount?: number;
}

export interface WorkspaceMeetingSummaryDto {
  id: string;
  title: string;
  description: string | null;
  hasAudio: boolean;
  audioDurationSec: number | null;
  visibility: Visibility;
  publicSlug: string | null;
  createdAt: string;
  updatedAt: string;
  creator: { id: string; name: string; email: string } | null;
  sharedCount: number;
}

export function meetingToDto(m: Meeting): MeetingDto {
  return {
    id: m.id,
    workspaceId: m.workspaceId,
    createdByUserId: m.createdByUserId,
    title: m.title,
    description: m.description,
    transcript: m.transcript,
    summary: m.summary,
    hasAudio: m.hasAudio,
    audioContentType: m.audioContentType,
    audioDurationSec: m.audioDurationSec,
    audioSizeBytes: m.audioSizeBytes,
    audioUploadedAt: m.audioUploadedAt ? m.audioUploadedAt.toISOString() : null,
    publicSlug: m.publicSlug,
    visibility: m.visibility,
    publishedAt: m.publishedAt ? m.publishedAt.toISOString() : null,
    lastPublishedAt: m.lastPublishedAt ? m.lastPublishedAt.toISOString() : null,
    settings: m.settings,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
    ...(m.creator !== undefined ? { creator: m.creator } : {}),
    ...(m.sharedCount !== undefined ? { sharedCount: m.sharedCount } : {}),
  };
}
