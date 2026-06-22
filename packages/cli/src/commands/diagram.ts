import { Command } from "commander";
import { api } from "../lib/api-client.js";
import type { AiRunDto } from "../lib/dto.js";
import { emit, shortDate, table } from "../lib/output.js";
import { resolveWorkspaceId } from "../lib/workspace.js";

export function diagramCommand(): Command {
  const cmd = new Command("diagram").description("Diagram-as-code generation");

  cmd
    .command("generate")
    .description("Queue an AI run that converts a prompt into an OctoFocusAI diagram")
    .argument("<prompt>", "Plain-text description of what to draw")
    .option("--workspace <id>", "Workspace id (defaults to your active workspace)")
    .option("--canvas <id>", "Target an existing canvas (otherwise the agent picks)")
    .option("--type <kind>", "flowchart | mind_map | process_map | architecture | sequence")
    .option("--json", "Emit raw JSON")
    .action(
      async (
        prompt: string,
        opts: {
          workspace?: string;
          canvas?: string;
          type?: string;
          json?: boolean;
        },
      ) => {
        const workspaceId = await resolveWorkspaceId(opts.workspace);
        const run = await api<AiRunDto>("/ai-runs", {
          method: "POST",
          body: {
            workspaceId,
            ...(opts.canvas ? { canvasId: opts.canvas } : {}),
            action: "DIAGRAM_GENERATE",
            input: { prompt, ...(opts.type ? { type: opts.type } : {}) },
          },
        });
        emit(run, opts, (r) => {
          process.stdout.write(
            table(
              ["queued", ""],
              [
                ["id", r.id],
                ["status", r.status],
                ["workspaceId", r.workspaceId],
                ["canvasId", r.canvasId ?? ""],
                ["createdAt", shortDate(r.createdAt)],
              ],
            ) + "\n",
          );
          process.stderr.write(
            "Track progress with `octofocus agent status " + r.id + "`.\n",
          );
        });
      },
    );

  return cmd;
}
