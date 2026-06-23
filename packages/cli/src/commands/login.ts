import { Command } from "commander";
import { loginViaBrowser } from "../lib/auth.js";
import { clearSession, loadConfig, saveConfig } from "../lib/config.js";
import { CliError } from "../lib/errors.js";
import { info, success } from "../lib/output.js";

interface LoginOpts {
  apiUrl?: string;
  webUrl?: string;
}

export function loginCommand(): Command {
  return new Command("login")
    .description(
      "Authenticate with OctoFocusAI. Opens your browser, you confirm, the CLI receives a long-lived token.",
    )
    .option("--api-url <url>", "Override the API URL (persisted)")
    .option("--web-url <url>", "Override the web app origin used for the bridge (persisted)")
    .action(async (opts: LoginOpts) => {
      const patch: Parameters<typeof saveConfig>[0] = {};
      if (opts.apiUrl) patch.apiUrl = opts.apiUrl;
      if (opts.webUrl) patch.webOrigin = opts.webUrl;
      if (Object.keys(patch).length > 0) await saveConfig(patch);

      if (!process.stdin.isTTY) {
        throw new CliError(
          "`login` requires a TTY (and a browser).",
          "Use OCTOFOCUS_TOKEN=<token> for non-interactive auth (agents, CI, Claude skills).",
        );
      }

      const cfg = await loadConfig();
      info(`Bridge: ${cfg.webOrigin}`);
      const session = await loginViaBrowser({
        webOrigin: cfg.webOrigin,
        onWaiting: (url) => {
          info("Opening your browser to authorize…");
          info(`If it doesn't open, visit: ${url}`);
          info("Waiting for confirmation…");
        },
      });
      success(`Signed in${session.email ? ` as ${session.email}` : ""}.`);
    });
}

export function logoutCommand(): Command {
  return new Command("logout")
    .description("Forget the cached session")
    .action(async () => {
      await clearSession();
      success("Signed out.");
    });
}
