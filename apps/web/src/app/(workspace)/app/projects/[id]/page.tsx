import { notFound } from "next/navigation";
import { createCanvasApi, listCanvasesApi } from "@/api/canvases-api";
import { getMeApi } from "@/api/me-api";
import { createPageApi, listPagesApi } from "@/api/pages-api";
import { getProjectApi } from "@/api/projects-api";
import { env } from "@/lib/env";
import { ProjectSplitView } from "./_components/project-split-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;

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

  const page = pages[0] ?? (await createPageApi(id, { title: "Untitled" }));
  const canvas = canvases[0] ?? (await createCanvasApi(id, { title: "Untitled canvas" }));

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
      initialDsl={initialDsl}
      workspaceSlug={workspaceSlug}
    />
  );
}
