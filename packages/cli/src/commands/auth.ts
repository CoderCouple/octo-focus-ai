import { Command } from "commander";
import { api } from "../lib/api-client.js";
import { emit, shortDate, success, table, truncate } from "../lib/output.js";

interface CliTokenDto {
  id: string;
  userId: string;
  name: string;
  tokenPreview: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

interface CliTokenCreatedDto extends CliTokenDto {
  plaintext: string;
}

export function authCommand(): Command {
  const cmd = new Command("auth").description("Manage CLI / agent auth tokens");

  const token = cmd.command("token").description("Long-lived bearer tokens for non-interactive use");

  token
    .command("list")
    .description("List your CLI tokens")
    .option("--json", "Emit raw JSON")
    .action(async (opts: { json?: boolean }) => {
      const rows = await api<CliTokenDto[]>("/me/cli-tokens");
      emit(rows, opts, (xs) => {
        process.stdout.write(
          table(
            ["ID", "Name", "Preview", "Last used", "Expires", "Revoked"],
            xs.map((t) => [
              t.id,
              truncate(t.name, 30),
              `…${t.tokenPreview}`,
              shortDate(t.lastUsedAt),
              shortDate(t.expiresAt),
              t.revokedAt ? "yes" : "",
            ]),
          ) + "\n",
        );
      });
    });

  token
    .command("create")
    .description("Mint a new CLI token. The plaintext is shown exactly once.")
    .argument("<name>", "Human-readable label (e.g. \"macbook\", \"ci\", \"claude-skill\")")
    .option("--expires-in-days <n>", "Optional expiry window", (v) => Number(v))
    .option("--json", "Emit raw JSON (includes the plaintext)")
    .action(
      async (
        name: string,
        opts: { expiresInDays?: number; json?: boolean },
      ) => {
        const created = await api<CliTokenCreatedDto>("/me/cli-tokens", {
          method: "POST",
          body: {
            name,
            ...(opts.expiresInDays !== undefined ? { expiresInDays: opts.expiresInDays } : {}),
          },
        });
        emit(created, opts, (t) => {
          process.stdout.write(t.plaintext + "\n");
          process.stderr.write(
            `\nToken "${t.name}" created (${t.id}).\n` +
              `Save the line above — it is shown only once.\n` +
              `Use it via: export OCTOFOCUS_TOKEN=<token>\n`,
          );
        });
      },
    );

  token
    .command("revoke")
    .description("Revoke a CLI token by id")
    .argument("<tokenId>", "Token id (cli_…)")
    .action(async (tokenId: string) => {
      const revoked = await api<CliTokenDto>(
        `/me/cli-tokens/${encodeURIComponent(tokenId)}`,
        { method: "DELETE" },
      );
      success(`Revoked ${revoked.id} ("${revoked.name}").`);
    });

  return cmd;
}
