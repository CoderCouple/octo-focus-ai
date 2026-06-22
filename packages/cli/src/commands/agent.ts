import { Command } from "commander";
import { api } from "../lib/api-client.js";
import type { AiRunDto } from "../lib/dto.js";
import { emit, shortDate, table, truncate } from "../lib/output.js";
import { resolveWorkspaceId } from "../lib/workspace.js";

export function agentCommand(): Command {
  const cmd = new Command("agent").description("Queue and inspect AI agent runs");

  cmd
    .command("run")
    .description("Queue an agent task as a new ai_run")
    .argument("<prompt>", "Prompt for the agent")
    .option("--workspace <id>", "Workspace id (defaults to your active workspace)")
    .option("--project <id>", "Scope the run to a project")
    .option("--page <id>", "Scope the run to a page")
    .option("--canvas <id>", "Scope the run to a canvas")
    .option("--action <name>", "Override the action label", "AGENT_RUN")
    .option("--json", "Emit raw JSON")
    .action(
      async (
        prompt: string,
        opts: {
          workspace?: string;
          project?: string;
          page?: string;
          canvas?: string;
          action: string;
          json?: boolean;
        },
      ) => {
        const workspaceId = await resolveWorkspaceId(opts.workspace);
        const body = {
          workspaceId,
          ...(opts.project ? { projectId: opts.project } : {}),
          ...(opts.page ? { pageId: opts.page } : {}),
          ...(opts.canvas ? { canvasId: opts.canvas } : {}),
          action: opts.action,
          input: { prompt },
        };
        const run = await api<AiRunDto>("/ai-runs", { method: "POST", body });
        emit(run, opts, (r) => renderRun(r, "queued"));
      },
    );

  cmd
    .command("status")
    .description("Inspect one or more recent ai_runs")
    .argument("[runId]", "ai_run id (ai_…). Omit to list recent runs.")
    .option("--workspace <id>", "Workspace id (used when listing)")
    .option("--limit <n>", "Max runs to list", (v) => Number(v), 20)
    .option("--json", "Emit raw JSON")
    .action(
      async (
        runId: string | undefined,
        opts: { workspace?: string; limit: number; json?: boolean },
      ) => {
        if (runId) {
          const run = await api<AiRunDto>(`/ai-runs/${encodeURIComponent(runId)}`);
          emit(run, opts, renderRun);
          return;
        }
        const workspaceId = await resolveWorkspaceId(opts.workspace);
        const runs = await api<AiRunDto[]>(
          `/workspaces/${encodeURIComponent(workspaceId)}/ai-runs`,
          { query: { limit: opts.limit } },
        );
        emit(runs, opts, (rows) => {
          process.stdout.write(
            table(
              ["ID", "Action", "Status", "Project", "Created"],
              rows.map((r) => [
                r.id,
                truncate(r.action, 24),
                r.status,
                r.projectId,
                shortDate(r.createdAt),
              ]),
            ) + "\n",
          );
        });
      },
    );

  return cmd;
}

function renderRun(run: AiRunDto, label: string = "run"): void {
  process.stdout.write(
    table(
      [label, ""],
      [
        ["id", run.id],
        ["action", run.action],
        ["status", run.status],
        ["workspaceId", run.workspaceId],
        ["projectId", run.projectId ?? ""],
        ["pageId", run.pageId ?? ""],
        ["canvasId", run.canvasId ?? ""],
        ["createdAt", shortDate(run.createdAt)],
        ["completedAt", run.completedAt ? shortDate(run.completedAt) : ""],
      ],
    ) + "\n",
  );
  if (run.status === "PENDING") {
    process.stderr.write(
      "Note: backend AI execution is currently stubbed — runs stay PENDING until a worker is wired.\n",
    );
  }
}
