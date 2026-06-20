import { getCanvasApi } from "@/api/canvases-api";
import { CanvasPane } from "@/components/canvas-pane";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CanvasEditorPage({ params }: PageProps) {
  const { id } = await params;
  const canvas = await getCanvasApi(id);
  const dsl =
    canvas.diagramSchema &&
    typeof canvas.diagramSchema === "object" &&
    "dsl" in canvas.diagramSchema &&
    typeof (canvas.diagramSchema as Record<string, unknown>).dsl === "string"
      ? ((canvas.diagramSchema as Record<string, unknown>).dsl as string)
      : "";

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <CanvasPane canvasId={canvas.id} initialDocument={canvas.document} initialDsl={dsl} />
    </div>
  );
}
