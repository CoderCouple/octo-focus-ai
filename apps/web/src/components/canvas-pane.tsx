"use client";

import { Pencil } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "tldraw";
import { OctoCanvas } from "@/app/(workspace)/app/canvas/[id]/_components/octo-canvas-dynamic";
import { CanvasExportDialog } from "@/components/canvas-export-dialog";
import { DslDrawer } from "@/components/dsl-drawer";
import { Toggle } from "@/components/ui/toggle";
import { updateCanvasAction } from "@/actions/canvases-action";

const DSL_SAVE_DEBOUNCE_MS = 1000;

interface CanvasPaneProps {
  canvasId: string;
  initialDocument: unknown;
  initialDsl: string;
}

export function CanvasPane({ canvasId, initialDocument, initialDsl }: CanvasPaneProps) {
  const [autoShape, setAutoShape] = useState(false);
  const [dslOpen, setDslOpen] = useState(false);
  const [dsl, setDsl] = useState(initialDsl);
  const dslSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const handleEditorReady = useCallback((e: Editor) => {
    editorRef.current = e;
  }, []);
  const getEditor = useCallback(() => editorRef.current, []);

  useEffect(() => {
    return () => {
      if (dslSaveTimer.current) clearTimeout(dslSaveTimer.current);
    };
  }, []);

  function onDslChange(value: string) {
    setDsl(value);
    if (dslSaveTimer.current) clearTimeout(dslSaveTimer.current);
    dslSaveTimer.current = setTimeout(() => {
      void updateCanvasAction(canvasId, { diagramSchema: { dsl: value } }).catch((err) =>
        console.error("DSL save failed", err),
      );
    }, DSL_SAVE_DEBOUNCE_MS);
  }

  return (
    <div className="flex h-full flex-col">
      <header className="bg-card flex h-10 shrink-0 items-center gap-1 border-b px-2">
        <Toggle
          pressed={autoShape}
          onPressedChange={setAutoShape}
          size="sm"
          aria-label="Auto-shape"
          title="Pencil strokes snap to clean shapes"
        >
          <Pencil className="h-3.5 w-3.5" />
          Auto-shape
        </Toggle>
        <div className="ml-auto">
          <CanvasExportDialog canvasId={canvasId} getEditor={getEditor} />
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <OctoCanvas
          canvasId={canvasId}
          initialDocument={initialDocument}
          autoShape={autoShape}
          dsl={dsl}
          onEditorReady={handleEditorReady}
        />
      </div>
      <DslDrawer open={dslOpen} onOpenChange={setDslOpen} value={dsl} onChange={onDslChange} />
    </div>
  );
}
