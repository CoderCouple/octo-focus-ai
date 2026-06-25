import { notFound } from "next/navigation";
import { extractDsl } from "@/features/canvas";
import { listProjectCanvasesApi } from "@/features/canvas/api/canvases-api";
import { listProjectNotesApi } from "@/features/notes/api/notes-api";
import { getProjectApi } from "@/features/projects/api/projects-api";
import { getMeApi } from "@/features/workspaces/api/workspaces-api";
import { ProjectSplitView } from "./_components/project-split-view";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}

function parseMode(raw: string | undefined): "notes" | "canvas" | "both" | undefined {
  if (raw === "notes" || raw === "canvas" || raw === "both") return raw;
  return undefined;
}

export default async function ProjectDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { mode } = await searchParams;

  let project;
  try {
    project = await getProjectApi(id);
  } catch {
    notFound();
  }

  const [pages, canvases, me] = await Promise.all([
    listProjectNotesApi(id),
    listProjectCanvasesApi(id),
    getMeApi(),
  ]);
  const workspaceSlug =
    me.memberships.find((m) => m.workspace.id === project.workspaceId)?.workspace.slug ?? "";

  // New projects always have a note AND canvas (createProjectAction seeds
  // both). Legacy projects may still have only one pane; the split view
  // tolerates nulls so they stay viewable.
  const page = pages[0] ?? null;
  const canvas = canvases[0] ?? null;
  const initialDsl = canvas ? extractDsl(canvas.diagramSchema) : "";

  return (
    <ProjectSplitView
      project={project}
      page={page}
      canvas={canvas}
      initialDsl={initialDsl}
      workspaceSlug={workspaceSlug}
      initialMode={parseMode(mode)}
    />
  );
}
