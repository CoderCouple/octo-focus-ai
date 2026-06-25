import { NextResponse } from "next/server";
import { extractDsl } from "@/features/canvas";
import { fetchPublicBySlug } from "@/features/public";

export const revalidate = 60;

/**
 * GitHub-raw-style endpoint for published notes and canvases. Returns
 * the underlying source — markdown for notes, DSL for canvases — as
 * `text/plain` so it can be `curl`-ed, piped into AI tools, or embedded
 * in a `<script src=...>` without HTML chrome.
 *
 * Pattern mirrors `raw.githubusercontent.com`:
 *   /p/<workspaceSlug>/<slug>      → styled public view
 *   /raw/p/<workspaceSlug>/<slug>  → raw text source
 *
 * Resource resolution:
 *   - page      → contentMd
 *   - canvas    → diagramSchema → DSL
 *   - project   → page.contentMd (if present) else canvas DSL
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ workspaceSlug: string; slug: string }> },
) {
  const { workspaceSlug, slug } = await ctx.params;
  const resource = await fetchPublicBySlug(workspaceSlug, slug);
  if (!resource) {
    return new NextResponse("Not found", { status: 404, headers: textHeaders() });
  }

  if (resource.kind === "page") {
    return new NextResponse(resource.data.contentMd ?? "", {
      status: 200,
      headers: textHeaders("text/markdown; charset=utf-8"),
    });
  }

  if (resource.kind === "canvas") {
    const dsl = extractDsl(resource.data.diagramSchema);
    return new NextResponse(dsl, {
      status: 200,
      headers: textHeaders(),
    });
  }

  // project: prefer the note's markdown; fall back to the canvas DSL;
  // emit a one-line header so the consumer knows which side of the
  // project they got.
  if (resource.page?.contentMd) {
    return new NextResponse(resource.page.contentMd, {
      status: 200,
      headers: textHeaders("text/markdown; charset=utf-8"),
    });
  }
  if (resource.canvas) {
    return new NextResponse(extractDsl(resource.canvas.diagramSchema), {
      status: 200,
      headers: textHeaders(),
    });
  }
  return new NextResponse("", { status: 200, headers: textHeaders() });
}

function textHeaders(contentType = "text/plain; charset=utf-8"): HeadersInit {
  return {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=60, s-maxage=60",
    "Access-Control-Allow-Origin": "*",
    "X-Robots-Tag": "noindex",
  };
}
