import { notFound } from "next/navigation";
import { createPageApi, listPagesApi } from "@/api/pages-api";
import { createCanvasApi, extractDsl, listProjectCanvasesApi } from "@/features/canvas";
import { getProjectApi } from "@/features/projects";
import { getMeApi } from "@/features/workspaces";
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
    listProjectCanvasesApi(id),
    env.DEV_AUTH_BYPASS
      ? Promise.resolve({ memberships: [{ workspace: { slug: "dev-workspace" } }] } as const)
      : getMeApi(),
  ]);
  const workspaceSlug = me.memberships[0]?.workspace.slug ?? "";

  // 1:1 model — every project has exactly one note and one canvas. Create
  // them on first open if the project doesn't have them yet.
  const page = pages[0] ?? (await createPageApi(id, { title: project.name }));
  const canvas = canvases[0] ?? (await createCanvasApi(id, { title: project.name }));
  const initialDsl = extractDsl(canvas.diagramSchema);

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
