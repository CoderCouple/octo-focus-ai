import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { ServerResponse } from "node:http";
import { z } from "zod";
import { AuthenticatedRequest, SupabaseAuthGuard } from "../../../auth/supabase-auth.guard";
import { SkipResponseInterceptor } from "../../../common/interceptor/skip-response-interceptor.decorator";
import { ZodValidationPipe } from "../../../common/zod-validation.pipe";
import { MeetingsService } from "../../../service/meetings.service";

const IdParam = new ZodValidationPipe(z.string().min(1).max(64));
import {
  MeetingCreateSchema,
  MeetingUpdateSchema,
  type MeetingCreate,
  type MeetingUpdate,
} from "../request/meeting.request";
import {
  meetingToDto,
  type MeetingDto,
  type WorkspaceMeetingSummaryDto,
} from "../response/meeting.response";

@Controller()
@UseGuards(SupabaseAuthGuard)
export class MeetingsController {
  constructor(private readonly meetings: MeetingsService) {}

  @Get("workspaces/:workspaceId/meetings")
  async listForWorkspace(
    @Param("workspaceId", IdParam) workspaceId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<WorkspaceMeetingSummaryDto[]> {
    const rows = await this.meetings.listForWorkspace(workspaceId, req.user.id);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      hasAudio: r.audioUploadedAt !== null,
      audioDurationSec: r.audioDurationSec,
      visibility: r.visibility as WorkspaceMeetingSummaryDto["visibility"],
      publicSlug: r.publicSlug,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      creator: r.creator,
      sharedCount: r.sharedCount,
    }));
  }

  @Get("meetings/:id")
  async getOne(
    @Param("id", IdParam) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<MeetingDto> {
    return meetingToDto(await this.meetings.getOne(id, req.user.id));
  }

  @Post("workspaces/:workspaceId/meetings")
  async create(
    @Param("workspaceId", IdParam) workspaceId: string,
    @Body(new ZodValidationPipe(MeetingCreateSchema)) body: MeetingCreate,
    @Req() req: AuthenticatedRequest,
  ): Promise<MeetingDto> {
    return meetingToDto(await this.meetings.create(workspaceId, body, req.user.id));
  }

  @Patch("meetings/:id")
  async update(
    @Param("id", IdParam) id: string,
    @Body(new ZodValidationPipe(MeetingUpdateSchema)) body: MeetingUpdate,
    @Req() req: AuthenticatedRequest,
  ): Promise<MeetingDto> {
    return meetingToDto(await this.meetings.update(id, body, req.user.id));
  }

  @Delete("meetings/:id")
  async delete(
    @Param("id", IdParam) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<MeetingDto> {
    return meetingToDto(await this.meetings.softDelete(id, req.user.id));
  }

  /**
   * Upload the recording binary. Body is `application/octet-stream`
   * (or whatever the browser MediaRecorder produced — webm by default).
   * Two custom headers:
   * - `x-audio-content-type`: e.g. "audio/webm"
   * - `x-audio-duration-sec`: optional integer
   *
   * We use a raw body parser at the Fastify level for the meeting
   * recording route so the Buffer reaches us un-mangled (see main.ts).
   */
  @Post("meetings/:id/audio")
  async uploadAudio(
    @Param("id", IdParam) id: string,
    @Req() req: AuthenticatedRequest & { body: Buffer },
  ): Promise<MeetingDto> {
    const contentType =
      (req.headers["x-audio-content-type"] as string | undefined) ?? "audio/webm";
    const durationHeader = req.headers["x-audio-duration-sec"];
    const durationSec =
      typeof durationHeader === "string" ? Number.parseInt(durationHeader, 10) : undefined;
    return meetingToDto(
      await this.meetings.storeAudio(id, req.user.id, {
        content: Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body as Uint8Array),
        contentType,
        ...(durationSec !== undefined && Number.isFinite(durationSec)
          ? { durationSec }
          : {}),
      }),
    );
  }

  /**
   * Stream the audio blob. Bypasses ResponseInterceptor so the body
   * isn't JSON-wrapped — clients render it directly via `<audio src=...>`.
   */
  @Get("meetings/:id/audio")
  @SkipResponseInterceptor()
  async streamAudio(
    @Param("id", IdParam) id: string,
    @Req() req: AuthenticatedRequest,
    @Res() reply: { raw: ServerResponse },
  ): Promise<void> {
    const audio = await this.meetings.streamAudio(id, req.user.id);
    const raw = reply.raw;
    raw.setHeader("Content-Type", audio.contentType);
    raw.setHeader("Content-Length", audio.content.byteLength.toString());
    raw.setHeader("Cache-Control", "private, max-age=3600");
    raw.end(audio.content);
  }
}
