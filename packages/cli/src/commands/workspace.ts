import { Command } from "commander";
import { api } from "../lib/api-client.js";
import { loadConfig, saveConfig } from "../lib/config.js";
import type { MeDto } from "../lib/dto.js";
import { CliError } from "../lib/errors.js";
import { emit, success, table } from "../lib/output.js";

export function workspaceCommand(): Command {
  const cmd = new Command("workspace").description("Manage workspace selection");

  cmd
    .command("list")
    .description("List workspaces you belong to")
    .option("--json", "Emit raw JSON")
    .action(async (opts: { json?: boolean }) => {
      const me = await api<MeDto>("/me");
      const cfg = await loadConfig();
      emit(me.memberships, opts, (rows) => {
        process.stdout.write(
          table(
            ["Active", "ID", "Name", "Slug", "Role"],
            rows.map((p) => [
              p.workspace.id === cfg.defaultWorkspaceId ? "*" : "",
              p.workspace.id,
              p.workspace.name,
              p.workspace.slug,
              p.membership.role,
            ]),
          ) + "\n",
        );
      });
    });

  cmd
    .command("use")
    .description("Set the active workspace for future commands")
    .argument("<workspaceId>", "Workspace id (wsp_…)")
    .action(async (workspaceId: string) => {
      const me = await api<MeDto>("/me");
      const match = me.memberships.find((p) => p.workspace.id === workspaceId);
      if (!match) {
        throw new CliError(
          `You are not a member of ${workspaceId}.`,
          "Run `octofocus workspace list` to see your workspaces.",
        );
      }
      await saveConfig({ defaultWorkspaceId: workspaceId });
      success(`Active workspace set to ${match.workspace.name} (${workspaceId}).`);
    });

  return cmd;
}
