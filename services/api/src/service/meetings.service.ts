import { Injectable } from "@nestjs/common";
import type {
  MeetingCreate,
  MeetingUpdate,
} from "../api/v1/request/meeting.request";
import { ChangeEventsService } from "../common/change-events.service";
import { NotFound } from "../common/error/error-factory";
import {
  MeetingsRepository,
  type MeetingRowWithMeta,
} from "../db/repository/meetings.repository";
import { toMeeting, type Meeting } from "../model/meeting.model";
import { WorkspacesService } from "./workspaces.service";

@Injectable()
export class MeetingsService {
  constructor(
    private readonly meetingsRepo: MeetingsRepository,
    private readonly workspacesService: WorkspacesService,
    private readonly changeEvents: ChangeEventsService,
  ) {}

  async listForWorkspace(
    workspaceId: string,
    actorUserId: string,
  ): Promise<MeetingRowWithMeta[]> {
    await this.workspacesService.requireRole(actorUserId, workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    return this.meetingsRepo.listForWorkspace(workspaceId);
  }

  async getOne(meetingId: string, actorUserId: string): Promise<Meeting> {
    const row = await this.meetingsRepo.findById(meetingId);
    if (!row) throw NotFound("Meeting not found.");
    await this.workspacesService.requireRole(actorUserId, row.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    return toMeeting(row);
  }

  async create(
    workspaceId: string,
    input: MeetingCreate,
    actorUserId: string,
  ): Promise<Meeting> {
    await this.workspacesService.requireRole(actorUserId, workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    const row = await this.meetingsRepo.insert({
      workspaceId,
      createdByUserId: actorUserId,
      title: input.title,
      description: input.description ?? null,
    });
    await this.changeEvents.record({
      workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "meeting",
      entityId: row.id,
      action: "meeting.create",
      after: row,
    });
    return toMeeting(row);
  }

  async update(
    meetingId: string,
    patch: MeetingUpdate,
    actorUserId: string,
  ): Promise<Meeting> {
    const existing = await this.meetingsRepo.findById(meetingId);
    if (!existing) throw NotFound("Meeting not found.");
    await this.workspacesService.requireRole(actorUserId, existing.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    const updated = await this.meetingsRepo.updateById(meetingId, {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.transcript !== undefined ? { transcript: patch.transcript } : {}),
      ...(patch.summary !== undefined ? { summary: patch.summary } : {}),
    });
    if (!updated) throw NotFound("Meeting not found.");
    await this.changeEvents.record({
      workspaceId: existing.workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "meeting",
      entityId: meetingId,
      action: "meeting.update",
      before: existing,
      after: updated,
      patch,
    });
    return toMeeting(updated);
  }

  async softDelete(meetingId: string, actorUserId: string): Promise<Meeting> {
    const existing = await this.meetingsRepo.findById(meetingId);
    if (!existing) throw NotFound("Meeting not found.");
    await this.workspacesService.requireRole(actorUserId, existing.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    const updated = await this.meetingsRepo.softDeleteById(meetingId);
    if (!updated) throw NotFound("Meeting not found.");
    await this.changeEvents.record({
      workspaceId: existing.workspaceId,
      actorType: "USER",
      userId: actorUserId,
      entityType: "meeting",
      entityId: meetingId,
      action: "meeting.delete",
      before: existing,
      after: updated,
    });
    return toMeeting(updated);
  }

  /** Persist the recorded audio blob. */
  async storeAudio(
    meetingId: string,
    actorUserId: string,
    audio: { content: Buffer; contentType: string; durationSec?: number },
  ): Promise<Meeting> {
    const existing = await this.meetingsRepo.findById(meetingId);
    if (!existing) throw NotFound("Meeting not found.");
    await this.workspacesService.requireRole(actorUserId, existing.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    const updated = await this.meetingsRepo.storeAudio(meetingId, {
      content: audio.content,
      contentType: audio.contentType,
      ...(audio.durationSec !== undefined ? { durationSec: audio.durationSec } : {}),
      sizeBytes: audio.content.byteLength,
    });
    if (!updated) throw NotFound("Meeting not found.");
    return toMeeting(updated);
  }

  async streamAudio(
    meetingId: string,
    actorUserId: string,
  ): Promise<{ content: Buffer; contentType: string }> {
    const row = await this.meetingsRepo.findById(meetingId);
    if (!row) throw NotFound("Meeting not found.");
    await this.workspacesService.requireRole(actorUserId, row.workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);
    const audio = await this.meetingsRepo.getAudio(meetingId);
    if (!audio) throw NotFound("No recording uploaded yet.");
    return audio;
  }
}
