import { notFound } from "next/navigation";
import { extractDsl } from "@/features/canvas";
import { createCanvasApi, listProjectCanvasesApi } from "@/features/canvas/api/canvases-api";
import { createNoteApi, listProjectNotesApi } from "@/features/notes/api/notes-api";
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

  // 1:1 model — every project has exactly one note and one canvas. Create
  // them on first open if the project doesn't have them yet.
  const page = pages[0] ?? (await createNoteApi(id, { title: project.name }));
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
