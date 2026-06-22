import { Command } from "commander";
import prompts from "prompts";
import { sendMagicCode, verifyMagicCode } from "../lib/auth.js";
import { clearSession, loadConfig, saveConfig } from "../lib/config.js";
import { CliError } from "../lib/errors.js";
import { info, success } from "../lib/output.js";

export function loginCommand(): Command {
  return new Command("login")
    .description("Authenticate with OctoFocusAI via a one-time code emailed to you")
    .option("--email <email>", "Skip the prompt and request a code for this address")
    .option("--api-url <url>", "Override the API URL (also persisted)")
    .option("--supabase-url <url>", "Override the Supabase project URL (also persisted)")
    .option("--supabase-anon-key <key>", "Override the Supabase anon key (also persisted)")
    .action(async (opts: {
      email?: string;
      apiUrl?: string;
      supabaseUrl?: string;
      supabaseAnonKey?: string;
    }) => {
      const patch: Parameters<typeof saveConfig>[0] = {};
      if (opts.apiUrl) patch.apiUrl = opts.apiUrl;
      if (opts.supabaseUrl) patch.supabaseUrl = opts.supabaseUrl;
      if (opts.supabaseAnonKey) patch.supabaseAnonKey = opts.supabaseAnonKey;
      if (Object.keys(patch).length > 0) await saveConfig(patch);

      if (!opts.email && !process.stdin.isTTY) {
        throw new CliError(
          "`login` is interactive and requires a TTY.",
          "Use OCTOFOCUS_TOKEN=<jwt> for non-interactive auth (agents, CI, Claude skills).",
        );
      }

      const cfg = await loadConfig();
      if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
        throw new CliError(
          "Supabase credentials are not configured.",
          "Re-run with --supabase-url and --supabase-anon-key (find them in the apps/web .env).",
        );
      }

      const email = opts.email ?? (await askEmail());
      info(`Sending a one-time code to ${email}…`);
      await sendMagicCode(email);
      info("Check your inbox. Paste the 6-digit code below.");

      const token = await askCode();
      const session = await verifyMagicCode(email, token);
      success(`Signed in as ${session.email ?? email}.`);
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

async function askEmail(): Promise<string> {
  const res = await prompts(
    {
      type: "text",
      name: "email",
      message: "Email",
      validate: (v: string) => (/.+@.+\..+/.test(v) ? true : "Enter a valid email"),
    },
    { onCancel: cancel },
  );
  return res.email as string;
}

async function askCode(): Promise<string> {
  const res = await prompts(
    {
      type: "text",
      name: "code",
      message: "Code",
      validate: (v: string) => (v.trim().length >= 6 ? true : "Code must be 6+ characters"),
    },
    { onCancel: cancel },
  );
  return (res.code as string).trim();
}

function cancel(): boolean {
  throw new CliError("Cancelled.");
}
