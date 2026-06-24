import { notFound } from "next/navigation";
import { extractDsl } from "@/features/canvas";
import { listProjectCanvasesApi } from "@/features/canvas/api/canvases-api";
import { listProjectNotesApi } from "@/features/notes/api/notes-api";
import { getProjectApi } from "@/features/projects/api/projects-api";
import { getMeApi } from "@/features/workspaces/api/workspaces-api";
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
    listProjectNotesApi(id),
    listProjectCanvasesApi(id),
    getMeApi(),
  ]);
  const workspaceSlug =
    me.memberships.find((m) => m.workspace.id === project.workspaceId)?.workspace.slug ?? "";

  // Project is flexible: it may have a note, a canvas, both, or neither
  // (right after creation). Pass whatever exists; the split view decides
  // what to render and offers "Add note" / "Add canvas" affordances for
  // the missing side.
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
    />
  );
}
