import { CanvasPane, extractDsl } from "@/features/canvas";
import { getCanvasApi } from "@/features/canvas/api/canvases-api";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CanvasEditorPage({ params }: PageProps) {
  const { id } = await params;
  const canvas = await getCanvasApi(id);
  const dsl = extractDsl(canvas.diagramSchema);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <CanvasPane canvasId={canvas.id} initialDocument={canvas.document} initialDsl={dsl} />
    </div>
  );
}
