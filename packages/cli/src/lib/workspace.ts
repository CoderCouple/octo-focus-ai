import { api } from "./api-client.js";
import { loadConfig, saveConfig } from "./config.js";
import type { MeDto } from "./dto.js";
import { CliError } from "./errors.js";

export async function resolveWorkspaceId(flag: string | undefined): Promise<string> {
  if (flag) return flag;

  const cfg = await loadConfig();
  if (cfg.defaultWorkspaceId) return cfg.defaultWorkspaceId;

  const me = await api<MeDto>("/me");
  if (me.memberships.length === 0) {
    throw new CliError(
      "Your account has no workspaces.",
      "Sign in on the web app first — it auto-creates your personal workspace.",
    );
  }
  if (me.memberships.length === 1) {
    const id = me.memberships[0]!.workspace.id;
    await saveConfig({ defaultWorkspaceId: id });
    return id;
  }
  throw new CliError(
    `You belong to ${me.memberships.length} workspaces. Pick one explicitly.`,
    "Pass --workspace <wsp_…> or run `octofocus workspace use <wsp_…>` to set a default.",
  );
}
