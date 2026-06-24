import { CanvasPane, extractDsl } from "@/features/canvas";
import { getCanvasApi } from "@/features/canvas/api/canvases-api";
import { getProjectApi } from "@/features/projects/api/projects-api";
import { getMeApi } from "@/features/workspaces/api/workspaces-api";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CanvasEditorPage({ params }: PageProps) {
  const { id } = await params;
  const canvas = await getCanvasApi(id);
  const dsl = extractDsl(canvas.diagramSchema);

  // Look up the workspace slug for the share popover's public URLs. Canvas
  // doesn't carry its workspace directly — we walk canvas → project →
  // workspace via /me memberships.
  const [project, me] = await Promise.all([
    getProjectApi(canvas.projectId),
    getMeApi(),
  ]);
  const workspaceSlug =
    me.memberships.find((m) => m.workspace.id === project.workspaceId)?.workspace.slug ?? "";

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
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
  );
}
