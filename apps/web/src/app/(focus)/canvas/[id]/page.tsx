import { notFound } from "next/navigation";
import { FloatingAiLauncher } from "@/features/ai-chat";
import {
  CanvasPane,
  extractDsl,
  extractDslLanguage,
  extractSourceOpen,
} from "@/features/canvas";
import { getCanvasApi } from "@/features/canvas/api/canvases-api";
import { getProjectApi } from "@/features/projects/api/projects-api";
import { getMeApi } from "@/features/workspaces/api/workspaces-api";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FocusCanvasPage({ params }: PageProps) {
  const { id } = await params;

  let canvas;
  try {
    canvas = await getCanvasApi(id);
  } catch {
    notFound();
  }

  const [project, me] = await Promise.all([getProjectApi(canvas.projectId), getMeApi()]);
  const workspaceSlug =
    me.memberships.find((m) => m.workspace.id === project.workspaceId)?.workspace.slug ?? "";
  const dsl = extractDsl(canvas.diagramSchema);
  const language = extractDslLanguage(canvas.diagramSchema);
  const sourceOpen = extractSourceOpen(canvas.diagramSchema);

  return (
    <div className="h-full">
      <CanvasPane
        canvasId={canvas.id}
        initialDocument={canvas.document}
        initialDsl={dsl}
        initialLanguage={language}
        initialSourceOpen={sourceOpen}
        canvasTitle={canvas.title}
        initialVisibility={canvas.visibility}
        initialPublicSlug={canvas.publicSlug}
        workspaceSlug={workspaceSlug}
        workspaceId={project.workspaceId}
        closeHref="/workspace/canvas"
      />
      <FloatingAiLauncher
        resourceKind="canvas"
        resourceId={canvas.id}
        resourceTitle={canvas.title}
      />
    </div>
  );
}
