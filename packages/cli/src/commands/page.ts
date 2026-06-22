import { readFile, writeFile } from "node:fs/promises";
import { Command } from "commander";
import matter from "gray-matter";
import { api } from "../lib/api-client.js";
import type { PageDto, WorkspacePageSummaryDto } from "../lib/dto.js";
import { CliError } from "../lib/errors.js";
import { emit, info, shortDate, success, table, truncate } from "../lib/output.js";
import { resolveWorkspaceId } from "../lib/workspace.js";

export function pageCommand(): Command {
  const cmd = new Command("page").description("Manage pages (markdown notes)");

  cmd
    .command("list")
    .description("List pages in a workspace or project")
    .option("--workspace <id>", "Workspace id (defaults to your active workspace)")
    .option("--project <id>", "List pages inside a single project instead")
    .option("--json", "Emit raw JSON")
    .action(async (opts: { workspace?: string; project?: string; json?: boolean }) => {
      if (opts.project) {
        const pages = await api<PageDto[]>(
          `/projects/${encodeURIComponent(opts.project)}/pages`,
        );
        emit(pages, opts, (rows) => {
          process.stdout.write(
            table(
              ["ID", "Title", "Visibility", "Updated"],
              rows.map((p) => [
                p.id,
                truncate(p.title, 40),
                p.visibility,
                shortDate(p.updatedAt),
              ]),
            ) + "\n",
          );
        });
        return;
      }
      const workspaceId = await resolveWorkspaceId(opts.workspace);
      const pages = await api<WorkspacePageSummaryDto[]>(
        `/workspaces/${encodeURIComponent(workspaceId)}/pages`,
      );
      emit(pages, opts, (rows) => {
        process.stdout.write(
          table(
            ["ID", "Title", "Project", "Updated"],
            rows.map((p) => [
              p.id,
              truncate(p.title, 40),
              truncate(p.projectName, 24),
              shortDate(p.updatedAt),
            ]),
          ) + "\n",
        );
      });
    });

  cmd
    .command("pull")
    .description("Pull a page's markdown body to disk")
    .argument("<pageId>", "Page id (pag_…)")
    .option("-o, --output <file>", "Write to this path (default: <slugified-title>.md)")
    .action(async (pageId: string, opts: { output?: string }) => {
      const page = await api<PageDto>(`/pages/${encodeURIComponent(pageId)}`);
      const out = opts.output ?? `${slugify(page.title) || page.id}.md`;
      const front = matter.stringify(page.contentMd, {
        octofocusPageId: page.id,
        title: page.title,
        updatedAt: page.updatedAt,
      });
      await writeFile(out, front, "utf8");
      success(`Pulled ${page.id} → ${out}`);
    });

  cmd
    .command("push")
    .description("Push a local markdown file back to its page")
    .argument("<file>", "Path to a markdown file")
    .option("--id <pageId>", "Page id (only required when the file has no frontmatter)")
    .option("--title <title>", "Optional new title")
    .action(async (file: string, opts: { id?: string; title?: string }) => {
      const raw = await readFile(file, "utf8");
      const parsed = matter(raw);
      const pageId =
        opts.id ?? (parsed.data["octofocusPageId"] as string | undefined);
      if (!pageId) {
        throw new CliError(
          "Cannot determine page id.",
          "Either pass --id <pag_…> or include `octofocusPageId:` in the file's frontmatter.",
        );
      }
      const body: { contentMd: string; title?: string } = { contentMd: parsed.content };
      if (opts.title) body.title = opts.title;
      else if (typeof parsed.data["title"] === "string") body.title = parsed.data["title"];

      info(`Pushing ${file} → ${pageId}…`);
      const updated = await api<PageDto>(`/pages/${encodeURIComponent(pageId)}`, {
        method: "PATCH",
        body,
      });
      success(`Pushed. Updated at ${shortDate(updated.updatedAt)}.`);
    });

  return cmd;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
