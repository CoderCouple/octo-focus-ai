import { notFound } from "next/navigation";
import { createCanvasApi, listCanvasesApi } from "@/api/canvases-api";
import { getMeApi } from "@/api/me-api";
import { createPageApi, listPagesApi } from "@/api/pages-api";
import { getProjectApi } from "@/api/projects-api";
import { env } from "@/lib/env";
import { ProjectSplitView } from "./_components/project-split-view";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; canvas?: string }>;
}

export default async function ProjectDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { page: pageParam, canvas: canvasParam } = await searchParams;

  let project;
  try {
    project = await getProjectApi(id);
  } catch {
    notFound();
  }

  const [pages, canvases, me] = await Promise.all([
    listPagesApi(id),
    listCanvasesApi(id),
    env.DEV_AUTH_BYPASS
      ? Promise.resolve({ memberships: [{ workspace: { slug: "dev-workspace" } }] } as const)
      : getMeApi(),
  ]);
  const workspaceSlug = me.memberships[0]?.workspace.slug ?? "";

  // Pick the requested page/canvas, fall back to first, or auto-create one.
  let page = (pageParam && pages.find((p) => p.id === pageParam)) || pages[0];
  if (!page) page = await createPageApi(id, { title: "Untitled" });
  let canvas = (canvasParam && canvases.find((c) => c.id === canvasParam)) || canvases[0];
  if (!canvas) canvas = await createCanvasApi(id, { title: "Untitled canvas" });

  const initialDsl =
    canvas.diagramSchema &&
    typeof canvas.diagramSchema === "object" &&
    "dsl" in canvas.diagramSchema &&
    typeof (canvas.diagramSchema as Record<string, unknown>).dsl === "string"
      ? ((canvas.diagramSchema as Record<string, unknown>).dsl as string)
      : "";

  return (
    <ProjectSplitView
      project={project}
      page={page}
      canvas={canvas}
      pages={pages.map((p) => ({ id: p.id, title: p.title }))}
      canvases={canvases.map((c) => ({ id: c.id, title: c.title }))}
      initialDsl={initialDsl}
      workspaceSlug={workspaceSlug}
    />
  );
}
