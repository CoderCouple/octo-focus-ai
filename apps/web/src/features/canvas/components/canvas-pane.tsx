"use client";

import { ArrowLeft, Focus, Pencil, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Editor } from "tldraw";
import { DslDrawer } from "@/components/dsl-drawer";
import { EditableTitle } from "@/components/editable-title";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { SharePopover, type Visibility } from "@/features/sharing";
import { renameCanvasAction, updateCanvasAction } from "../actions/canvases-actions";
import { CanvasExportDialog } from "./canvas-export-dialog";
import { FromCodeDrawer } from "./from-code-drawer";
import { OctoCanvas } from "./octo-canvas-dynamic";
import { RefineDiagramDialog } from "./refine-diagram-dialog";

/** Cycle through layout directions in the order most useful for tinkering. */
const DIRECTION_CYCLE = ["right", "down", "left", "up"] as const;

/**
 * Toggle the `direction <…>` directive on the DSL — adds the line if it
 * isn't there yet, otherwise advances it through right → down → left → up.
 */
function flipDirection(dsl: string): string {
  const trimmed = dsl.replace(/\r/g, "");
  const match = trimmed.match(/^([ \t]*)direction\s+(\w+)/m);
  if (match) {
    const current = match[2] as (typeof DIRECTION_CYCLE)[number];
    const idx = DIRECTION_CYCLE.indexOf(current);
    const next = DIRECTION_CYCLE[(idx + 1) % DIRECTION_CYCLE.length];
    return trimmed.replace(/^([ \t]*)direction\s+\w+/m, `$1direction ${next}`);
  }
  return `direction down\n${trimmed}`;
}

const DSL_SAVE_DEBOUNCE_MS = 1000;

interface CanvasPaneProps {
  canvasId: string;
  initialDocument: unknown;
  initialDsl: string;
  /**
   * Per-canvas publish props. When provided, surfaces a Share popover in
   * the header that publishes THIS canvas independently of any parent
   * project. Omit when share lives elsewhere on the page.
   */
  canvasTitle?: string;
  initialVisibility?: Visibility;
  initialPublicSlug?: string | null;
  workspaceSlug?: string;
  /** See NotesPane.closeHref — same role. */
  closeHref?: string;
}

export function CanvasPane({
  canvasId,
  initialDocument,
  initialDsl,
  canvasTitle,
  initialVisibility,
  initialPublicSlug,
  workspaceSlug,
  closeHref,
}: CanvasPaneProps) {
  const [autoShape, setAutoShape] = useState(false);
  const [dslOpen, setDslOpen] = useState(false);
  const [dsl, setDsl] = useState(initialDsl);
  const [fitToken, setFitToken] = useState(0);
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
      void updateCanvasAction(canvasId, { diagramSchema: { dsl: value } }).then((r) => {
        if (!r.success) console.error("DSL save failed", r.message);
      });
    }, DSL_SAVE_DEBOUNCE_MS);
  }

  const canShare =
    initialVisibility !== undefined && workspaceSlug !== undefined && canvasTitle !== undefined;

  const [title, setTitle] = useState(canvasTitle ?? "");
  const handleRename = async (next: string) => {
    setTitle(next);
    const result = await renameCanvasAction(canvasId, next);
    if (!result.success) toast.error(result.message);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="bg-card flex h-10 shrink-0 items-center gap-2 border-b px-2">
        {closeHref ? (
          <div className="-ml-1 flex shrink-0 items-center gap-1">
            <Link
              href="/workspace/projects"
              aria-label="OctoFocusAI"
              className="bg-foreground text-background grid size-7 place-items-center rounded-md"
            >
              <Focus className="size-3.5" />
            </Link>
            <Link
              href={closeHref}
              aria-label="Back"
              className="hover:bg-accent text-muted-foreground grid size-7 place-items-center rounded"
            >
              <ArrowLeft className="size-4" />
            </Link>
          </div>
        ) : null}
        {canvasTitle !== undefined ? (
          <EditableTitle value={title} onSave={handleRename} placeholder="Untitled canvas" />
        ) : null}
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
        <div className="ml-auto flex items-center gap-1">
          <FromCodeDrawer
            currentDsl={dsl}
            onGenerated={(next) => {
              onDslChange(next);
              setDslOpen(true);
              setFitToken((t) => t + 1);
            }}
          />
          <RefineDiagramDialog
            currentDsl={dsl}
            onRefined={(next) => {
              onDslChange(next);
              setDslOpen(true);
              setFitToken((t) => t + 1);
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            disabled={!dsl.trim()}
            onClick={() => {
              const next = flipDirection(dsl);
              if (next === dsl) return;
              onDslChange(next);
              setFitToken((t) => t + 1);
            }}
            title="Cycle layout direction (right → down → left → up)"
          >
            <RefreshCw className="size-3.5" />
            Re-layout
          </Button>
          <CanvasExportDialog canvasId={canvasId} getEditor={getEditor} />
          {canShare ? (
            <SharePopover
              resourceKind="canvas"
              resourceId={canvasId}
              resourceTitle={canvasTitle!}
              initialVisibility={initialVisibility!}
              initialPublicSlug={initialPublicSlug ?? null}
              workspaceSlug={workspaceSlug!}
            />
          ) : null}
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <OctoCanvas
          canvasId={canvasId}
          initialDocument={initialDocument}
          autoShape={autoShape}
          dsl={dsl}
          fitToContent={fitToken}
          onEditorReady={handleEditorReady}
        />
      </div>
      <DslDrawer open={dslOpen} onOpenChange={setDslOpen} value={dsl} onChange={onDslChange} />
    </div>
  );
}
