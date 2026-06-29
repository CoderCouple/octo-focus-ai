import { beforeEach, describe, expect, it, vi } from "vitest";
import { MeetingsService } from "../../../src/service/meetings.service";

function row(over: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return {
    id: "mtg_1",
    workspaceId: "wsp_1",
    createdByUserId: "usr_a",
    title: "Sync",
    description: null,
    transcript: null as string | null,
    summary: null as string | null,
    publicSlug: null,
    visibility: "private",
    publishedAt: null,
    lastPublishedAt: null,
    settings: {},
    audioContentType: null,
    audioDurationSec: null,
    audioSizeBytes: null,
    audioUploadedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...over,
  };
}

function buildSut(opts?: {
  existing?: ReturnType<typeof row>;
  completeText?: (args: { system: string; user: string }) => Promise<string>;
}) {
  const existing = opts?.existing ?? row({ transcript: "Hello world from the meeting." });
  const meetingsRepo = {
    findById: vi.fn(async () => existing),
    updateById: vi.fn(async (id: string, patch: Record<string, unknown>) => ({
      ...existing,
      ...patch,
      id,
    })),
  };
  const workspacesService = { requireRole: vi.fn(async () => "MEMBER") };
  const changeEvents = { record: vi.fn(async () => undefined) };
  const llm = {
    completeText: vi.fn(
      opts?.completeText ?? (async () => "## Summary\nA quick sync about the demo.\n"),
    ),
  };
  const service = new MeetingsService(
    meetingsRepo as never,
    workspacesService as never,
    changeEvents as never,
    llm as never,
  );
  return { service, meetingsRepo, llm, changeEvents };
}

describe("MeetingsService.summarize", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects when there's no transcript yet", async () => {
    const { service, llm } = buildSut({ existing: row({ transcript: null }) });
    await expect(service.summarize("mtg_1", "usr_a")).rejects.toThrow(/no transcript/i);
    expect(llm.completeText).not.toHaveBeenCalled();
  });

  it("rejects when the transcript is whitespace only", async () => {
    const { service, llm } = buildSut({ existing: row({ transcript: "   \n  " }) });
    await expect(service.summarize("mtg_1", "usr_a")).rejects.toThrow(/no transcript/i);
    expect(llm.completeText).not.toHaveBeenCalled();
  });

  it("calls Claude with the transcript and persists the returned summary", async () => {
    const { service, meetingsRepo, llm, changeEvents } = buildSut();
    const out = await service.summarize("mtg_1", "usr_a");

    expect(llm.completeText).toHaveBeenCalledTimes(1);
    const call = llm.completeText.mock.calls[0]![0] as { system: string; user: string };
    expect(call.user).toContain("Hello world from the meeting.");
    expect(call.system.toLowerCase()).toContain("summary");

    expect(meetingsRepo.updateById).toHaveBeenCalledWith(
      "mtg_1",
      expect.objectContaining({ summary: expect.stringContaining("Summary") }),
    );
    expect(changeEvents.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "meeting.summarize" }),
    );
    expect(out.summary).toContain("Summary");
  });
});
