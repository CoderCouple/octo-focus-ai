import { Command } from "commander";
import { api } from "../lib/api-client.js";
import type { ProjectDto } from "../lib/dto.js";
import { emit, shortDate, table, truncate } from "../lib/output.js";
import { resolveWorkspaceId } from "../lib/workspace.js";

export function projectCommand(): Command {
  const cmd = new Command("project").description("Manage projects");

  cmd
    .command("list")
    .description("List projects in a workspace")
    .option("--workspace <id>", "Workspace id (defaults to your active workspace)")
    .option("--json", "Emit raw JSON")
    .action(async (opts: { workspace?: string; json?: boolean }) => {
      const workspaceId = await resolveWorkspaceId(opts.workspace);
      const projects = await api<ProjectDto[]>(
        `/workspaces/${encodeURIComponent(workspaceId)}/projects`,
      );
      emit(projects, opts, (rows) => {
        process.stdout.write(
          table(
            ["ID", "Name", "Visibility", "Updated"],
            rows.map((p) => [
              p.id,
              truncate(p.name, 40),
              p.visibility,
              shortDate(p.updatedAt),
            ]),
          ) + "\n",
        );
      });
    });

  return cmd;
}
