import { notFound } from "next/navigation";
import { AiChatPanel } from "@/features/ai-chat";
import { CanvasPane, extractDsl } from "@/features/canvas";
import { getCanvasApi } from "@/features/canvas/api/canvases-api";
import { getProjectApi } from "@/features/projects/api/projects-api";
import { getMeApi } from "@/features/workspaces/api/workspaces-api";
import { CloseButton } from "../../_components/close-button";

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

  return (
    <div className="relative flex h-full">
      <CloseButton href="/workspace/canvas" />
      <div className="flex-1 overflow-hidden">
        <CanvasPane
          canvasId={canvas.id}
          initialDocument={canvas.document}
          initialDsl={dsl}
          canvasTitle={canvas.title}
          initialVisibility={canvas.visibility}
          initialPublicSlug={canvas.publicSlug}
          workspaceSlug={workspaceSlug}
        />
      </div>
      <AiChatPanel resourceKind="canvas" resourceId={canvas.id} resourceTitle={canvas.title} />
    </div>
  );
}
