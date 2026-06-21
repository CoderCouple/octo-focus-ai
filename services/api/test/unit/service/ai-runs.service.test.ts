import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiRunsService } from "../../../src/service/ai-runs.service";

function runRow(over: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return {
    id: "run_1",
    userId: "usr_a",
    agentId: null,
    workspaceId: "wsp_1",
    projectId: null,
    pageId: null,
    canvasId: null,
    action: "page.create",
    status: "PENDING",
    input: {},
    output: null,
    createdAt: now,
    completedAt: null,
    ...over,
  };
}

function buildSut(opts?: { existing?: ReturnType<typeof runRow> }) {
  const runsRepo = {
    findById: vi.fn(async () => opts?.existing ?? null),
    listByWorkspace: vi.fn(async () => [runRow()]),
    insert: vi.fn(async (v: Record<string, unknown>) => runRow(v)),
    updateById: vi.fn(async (id: string, patch: Record<string, unknown>) =>
      runRow({ ...(opts?.existing ?? runRow()), id, ...patch }),
    ),
  };
  const workspacesService = { requireRole: vi.fn(async () => "MEMBER") };
  const service = new AiRunsService(runsRepo as never, workspacesService as never);
  return { service, runsRepo };
}

describe("AiRunsService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("create stamps PENDING + actor user", async () => {
    const { service, runsRepo } = buildSut();
    await service.create({ workspaceId: "wsp_1", action: "page.create", input: {} }, "usr_a");
    const v = runsRepo.insert.mock.calls[0]![0] as Record<string, unknown>;
    expect(v.status).toBe("PENDING");
    expect(v.userId).toBe("usr_a");
  });

  it("update stamps completedAt on terminal status", async () => {
    const { service, runsRepo } = buildSut({ existing: runRow() });
    await service.update("run_1", { status: "SUCCEEDED" }, "usr_a");
    const patch = runsRepo.updateById.mock.calls[0]![1] as Record<string, unknown>;
    expect(patch.completedAt).toBeInstanceOf(Date);
  });

  it("update does NOT stamp completedAt when already completed", async () => {
    const past = new Date("2025-01-01");
    const { service, runsRepo } = buildSut({
      existing: runRow({ status: "RUNNING", completedAt: past }),
    });
    await service.update("run_1", { status: "FAILED" }, "usr_a");
    const patch = runsRepo.updateById.mock.calls[0]![1] as Record<string, unknown>;
    expect("completedAt" in patch).toBe(false);
  });
});
