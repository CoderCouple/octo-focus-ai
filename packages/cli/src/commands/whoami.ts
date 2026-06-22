import { Command } from "commander";
import { api } from "../lib/api-client.js";
import type { MeDto } from "../lib/dto.js";
import { emit, table } from "../lib/output.js";

export function whoamiCommand(): Command {
  return new Command("whoami")
    .description("Show the signed-in user and their workspaces")
    .option("--json", "Emit raw JSON")
    .action(async (opts: { json?: boolean }) => {
      const me = await api<MeDto>("/me");
      emit(me, opts, (m) => {
        process.stdout.write(`${m.user.name}  <${m.user.email}>  (${m.user.id})\n\n`);
        process.stdout.write(
          table(
            ["Workspace", "Slug", "Role", "ID"],
            m.memberships.map((p) => [
              p.workspace.name,
              p.workspace.slug,
              p.membership.role,
              p.workspace.id,
            ]),
          ) + "\n",
        );
      });
    });
}
