import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { Database, DRIZZLE } from "../database.module";
import { meetings } from "../schemas/meetings";
import { resourceShares } from "../schemas/sharing";
import { users } from "../schemas/users";

export interface MeetingCreatorSummary {
  id: string;
  name: string;
  email: string;
}

// Row shape WITHOUT audio_content — the audio blob is never selected
// in list / detail queries to keep payloads small.
type MeetingRow = Omit<typeof meetings.$inferSelect, "audioContent">;

export type MeetingRowWithMeta = MeetingRow & {
  creator: MeetingCreatorSummary | null;
  sharedCount: number;
};

const meetingsCols = {
  id: meetings.id,
  workspaceId: meetings.workspaceId,
  createdByUserId: meetings.createdByUserId,
  title: meetings.title,
  description: meetings.description,
  transcript: meetings.transcript,
  summary: meetings.summary,
  audioContentType: meetings.audioContentType,
  audioDurationSec: meetings.audioDurationSec,
  audioSizeBytes: meetings.audioSizeBytes,
  audioUploadedAt: meetings.audioUploadedAt,
  publicSlug: meetings.publicSlug,
  visibility: meetings.visibility,
  publishedAt: meetings.publishedAt,
  lastPublishedAt: meetings.lastPublishedAt,
  settings: meetings.settings,
  createdAt: meetings.createdAt,
  updatedAt: meetings.updatedAt,
  deletedAt: meetings.deletedAt,
};

@Injectable()
export class MeetingsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findById(id: string): Promise<MeetingRow | null> {
    const rows = await this.db
      .select(meetingsCols)
      .from(meetings)
      .where(and(eq(meetings.id, id), isNull(meetings.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  async insert(values: {
    workspaceId: string;
    createdByUserId: string;
    title: string;
    description?: string | null;
  }): Promise<MeetingRow> {
    const rows = await this.db
      .insert(meetings)
      .values({
        workspaceId: values.workspaceId,
        createdByUserId: values.createdByUserId,
        title: values.title,
        description: values.description ?? null,
      })
      .returning(meetingsCols);
    return rows[0];
  }

  async updateById(
    id: string,
    patch: Partial<{
      title: string;
      description: string | null;
      transcript: string;
      summary: string;
    }>,
  ): Promise<MeetingRow | null> {
    const rows = await this.db
      .update(meetings)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(meetings.id, id))
      .returning(meetingsCols);
    return rows[0] ?? null;
  }

  /** Store an uploaded audio blob and its metadata. */
  async storeAudio(
    id: string,
    audio: { content: Buffer; contentType: string; durationSec?: number; sizeBytes: number },
  ): Promise<MeetingRow | null> {
    const rows = await this.db
      .update(meetings)
      .set({
        audioContent: audio.content,
        audioContentType: audio.contentType,
        audioDurationSec: audio.durationSec ?? null,
        audioSizeBytes: audio.sizeBytes,
        audioUploadedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, id))
      .returning(meetingsCols);
    return rows[0] ?? null;
  }

  async getAudio(
    id: string,
  ): Promise<{ content: Buffer; contentType: string } | null> {
    const rows = await this.db
      .select({
        content: meetings.audioContent,
        contentType: meetings.audioContentType,
      })
      .from(meetings)
      .where(and(eq(meetings.id, id), isNull(meetings.deletedAt)))
      .limit(1);
    const row = rows[0];
    if (!row || !row.content || !row.contentType) return null;
    return { content: row.content, contentType: row.contentType };
  }

  async softDeleteById(id: string): Promise<MeetingRow | null> {
    const rows = await this.db
      .update(meetings)
      .set({ deletedAt: new Date() })
      .where(eq(meetings.id, id))
      .returning(meetingsCols);
    return rows[0] ?? null;
  }

  async listForWorkspace(workspaceId: string): Promise<MeetingRowWithMeta[]> {
    const rows = await this.db
      .select({
        ...meetingsCols,
        creatorId: users.id,
        creatorName: users.name,
        creatorEmail: users.email,
      })
      .from(meetings)
      .leftJoin(users, eq(meetings.createdByUserId, users.id))
      .where(and(eq(meetings.workspaceId, workspaceId), isNull(meetings.deletedAt)))
      .orderBy(desc(meetings.updatedAt));

    if (rows.length === 0) return [];

    const meetingIds = rows.map((r) => r.id);
    const shareRows = await this.db
      .select({
        resourceId: resourceShares.resourceId,
        count: sql<number>`count(*)::int`,
      })
      .from(resourceShares)
      .where(
        and(
          eq(resourceShares.resourceKind, "meeting"),
          inArray(resourceShares.resourceId, meetingIds),
          eq(resourceShares.status, "active"),
        ),
      )
      .groupBy(resourceShares.resourceId);

    const sharedById = new Map(shareRows.map((r) => [r.resourceId, Number(r.count)]));

    return rows.map((r) => {
      const { creatorId, creatorName, creatorEmail, ...rest } = r;
      return {
        ...rest,
        creator:
          creatorId && creatorName && creatorEmail
            ? { id: creatorId, name: creatorName, email: creatorEmail }
            : null,
        sharedCount: sharedById.get(r.id) ?? 0,
      };
    });
  }
}
