import { readFile, writeFile } from "node:fs/promises";
import { Command } from "commander";
import matter from "gray-matter";
import { api } from "../lib/api-client.js";
import type { CanvasDto, WorkspaceCanvasSummaryDto } from "../lib/dto.js";
import { CliError } from "../lib/errors.js";
import { emit, info, shortDate, success, table, truncate } from "../lib/output.js";
import { resolveWorkspaceId } from "../lib/workspace.js";

export function canvasCommand(): Command {
  const cmd = new Command("canvas").description("Manage canvases (diagram-as-code)");

  cmd
    .command("list")
    .description("List canvases in a workspace or project")
    .option("--workspace <id>", "Workspace id (defaults to your active workspace)")
    .option("--project <id>", "List canvases inside a single project instead")
    .option("--json", "Emit raw JSON")
    .action(async (opts: { workspace?: string; project?: string; json?: boolean }) => {
      if (opts.project) {
        const canvases = await api<CanvasDto[]>(
          `/projects/${encodeURIComponent(opts.project)}/canvases`,
        );
        emit(canvases, opts, (rows) => {
          process.stdout.write(
            table(
              ["ID", "Title", "Visibility", "Updated"],
              rows.map((c) => [
                c.id,
                truncate(c.title, 40),
                c.visibility,
                shortDate(c.updatedAt),
              ]),
            ) + "\n",
          );
        });
        return;
      }
      const workspaceId = await resolveWorkspaceId(opts.workspace);
      const canvases = await api<WorkspaceCanvasSummaryDto[]>(
        `/workspaces/${encodeURIComponent(workspaceId)}/canvases`,
      );
      emit(canvases, opts, (rows) => {
        process.stdout.write(
          table(
            ["ID", "Title", "Project", "Updated"],
            rows.map((c) => [
              c.id,
              truncate(c.title, 40),
              truncate(c.projectName, 24),
              shortDate(c.updatedAt),
            ]),
          ) + "\n",
        );
      });
    });

  cmd
    .command("pull")
    .description("Pull a canvas' DSL text to disk")
    .argument("<canvasId>", "Canvas id (cnv_…)")
    .option("-o, --output <file>", "Write to this path (default: <slugified-title>.dsl)")
    .action(async (canvasId: string, opts: { output?: string }) => {
      const canvas = await api<CanvasDto>(`/canvases/${encodeURIComponent(canvasId)}`);
      const dsl = readDsl(canvas);
      const out = opts.output ?? `${slugify(canvas.title) || canvas.id}.dsl`;
      const front = matter.stringify(dsl, {
        octofocusCanvasId: canvas.id,
        title: canvas.title,
        updatedAt: canvas.updatedAt,
      });
      await writeFile(out, front, "utf8");
      success(`Pulled ${canvas.id} → ${out}`);
    });

  cmd
    .command("push")
    .description("Push a local DSL file back to its canvas")
    .argument("<file>", "Path to a DSL file")
    .option("--id <canvasId>", "Canvas id (only required when the file has no frontmatter)")
    .option("--title <title>", "Optional new title")
    .action(async (file: string, opts: { id?: string; title?: string }) => {
      const raw = await readFile(file, "utf8");
      const parsed = matter(raw);
      const canvasId =
        opts.id ?? (parsed.data["octofocusCanvasId"] as string | undefined);
      if (!canvasId) {
        throw new CliError(
          "Cannot determine canvas id.",
          "Either pass --id <cnv_…> or include `octofocusCanvasId:` in the file's frontmatter.",
        );
      }

      info(`Fetching current canvas ${canvasId}…`);
      const current = await api<CanvasDto>(`/canvases/${encodeURIComponent(canvasId)}`);
      const mergedDiagramSchema = {
        ...(current.diagramSchema ?? {}),
        dsl: parsed.content,
      };

      const body: { diagramSchema: typeof mergedDiagramSchema; title?: string } = {
        diagramSchema: mergedDiagramSchema,
      };
      if (opts.title) body.title = opts.title;
      else if (typeof parsed.data["title"] === "string") body.title = parsed.data["title"];

      info(`Pushing ${file} → ${canvasId}…`);
      const updated = await api<CanvasDto>(`/canvases/${encodeURIComponent(canvasId)}`, {
        method: "PATCH",
        body,
      });
      success(`Pushed. Updated at ${shortDate(updated.updatedAt)}.`);
    });

  return cmd;
}

function readDsl(canvas: CanvasDto): string {
  const schema = canvas.diagramSchema;
  if (schema && typeof schema === "object" && typeof schema.dsl === "string") {
    return schema.dsl;
  }
  return "";
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
