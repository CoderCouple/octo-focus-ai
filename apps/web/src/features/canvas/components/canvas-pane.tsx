"use client";

import {
  ArrowLeft,
  Code2,
  Focus,
  Group,
  LayoutGrid,
  NotebookPen,
  Shapes,
  Ungroup,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Editor } from "tldraw";
import { DslDrawer } from "@/components/dsl-drawer";
import { DslSidePanel } from "@/components/dsl-side-panel";
import { EditableTitle } from "@/components/editable-title";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  createSavedFigureClientApi,
  updateSavedFigureClientApi,
} from "@/features/figures";
import { SharePopover, type Visibility } from "@/features/sharing";
import { renameCanvasAction, updateCanvasAction } from "../actions/canvases-actions";
import type { DslLanguage } from "../lib/extract-dsl";
import { extractFigureSubgraphDsl } from "../lib/extract-figure-dsl";
import { ungroupSelection, wrapSelectionInFigure } from "../lib/wrap-figure";
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
  /** DSL flavour the user picked last time — defaults to "octo". */
  initialLanguage?: DslLanguage;
  /** Whether the Source side panel was open last time. */
  initialSourceOpen?: boolean;
  /**
   * Per-canvas publish props. When provided, surfaces a Share popover in
   * the header that publishes THIS canvas independently of any parent
   * project. Omit when share lives elsewhere on the page.
   */
  canvasTitle?: string;
  initialVisibility?: Visibility;
  initialPublicSlug?: string | null;
  workspaceSlug?: string;
  /** Required for the "Save figure" action — the figure POST is scoped to a workspace. */
  workspaceId?: string;
  /**
   * When provided (split view), the canvas-pane renders an extra
   * "Save & insert into note" button that pushes the saved figure
   * straight into the sibling NotesPane via its imperative handle —
   * skipping the clipboard hop entirely.
   */
  onInsertFigureIntoNote?: (figureId: string) => void;
  /** See NotesPane.closeHref — same role. */
  closeHref?: string;
}

export function CanvasPane({
  canvasId,
  initialDocument,
  initialDsl,
  initialLanguage = "octo",
  initialSourceOpen = false,
  canvasTitle,
  initialVisibility,
  initialPublicSlug,
  workspaceSlug,
  workspaceId,
  onInsertFigureIntoNote,
  closeHref,
}: CanvasPaneProps) {
  const [autoShape, setAutoShape] = useState(false);
  const [dslOpen, setDslOpen] = useState(false);
  // Persistent left-side editor. Open/close state and chosen DSL
  // flavour are stored on the canvas's `diagramSchema` jsonb so they
  // round-trip via the same debounced save as the DSL text itself.
  const [sourceOpen, setSourceOpen] = useState(initialSourceOpen);
  const [language, setLanguage] = useState<DslLanguage>(initialLanguage);
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

  /**
   * Persist the panel-open flag or language choice immediately — these
   * are user gestures, not stream-of-keystrokes, so no debounce. The
   * whole `diagramSchema` object is replaced on each save so we
   * always send the current `dsl` alongside.
   */
  function persistSchemaPatch(patch: { language?: DslLanguage; sourceOpen?: boolean }) {
    void updateCanvasAction(canvasId, {
      diagramSchema: {
        dsl,
        language: patch.language ?? language,
        sourceOpen: patch.sourceOpen ?? sourceOpen,
      },
    }).then((r) => {
      if (!r.success) console.error("Source panel state save failed", r.message);
    });
  }

  function toggleSourceOpen() {
    setSourceOpen((prev) => {
      const next = !prev;
      persistSchemaPatch({ sourceOpen: next });
      return next;
    });
  }

  function onLanguageChange(next: DslLanguage) {
    setLanguage(next);
    persistSchemaPatch({ language: next });
  }

  function onDslChange(value: string) {
    setDsl(value);
    if (dslSaveTimer.current) clearTimeout(dslSaveTimer.current);
    dslSaveTimer.current = setTimeout(() => {
      void updateCanvasAction(canvasId, {
        diagramSchema: { dsl: value, language, sourceOpen },
      }).then((r) => {
        if (!r.success) console.error("DSL save failed", r.message);
      });
      // Sync each DSL-backed figure-group to its `figures` row —
      // new figures get a POST, existing ones get a PATCH when the
      // subgraph DSL has actually changed. Runs after the canvas
      // save so the figure rows reflect the same DSL the canvas
      // itself persisted.
      void syncFiguresToBackend(value);
    }, DSL_SAVE_DEBOUNCE_MS);
  }

  /**
   * Last subgraph DSL we persisted for each figure id. Used to skip
   * redundant PATCHes when a canvas-wide DSL save didn't actually
   * change a particular figure's subgraph (touching the title or
   * adding an unrelated figure on the same canvas shouldn't trigger
   * a network call for every other figure).
   */
  const lastSyncedFigureDslRef = useRef<Map<string, string>>(new Map());

  /**
   * Walk all DSL-backed figure-group shapes on the canvas and ensure
   * each has a `figures` row reflecting its current subgraph. Auto-
   * saves new figures (POST) and patches existing ones whose subgraph
   * has drifted (PATCH). The shape's `meta.figureId` is written back
   * after a POST so the inline title-bar icons + drag handle activate
   * immediately. Failures are logged, not toasted — this is a
   * background sync, not a user-initiated action.
   */
  async function syncFiguresToBackend(canvasDsl: string) {
    if (!workspaceId) return;
    const editor = editorRef.current;
    if (!editor) return;
    const shapes = editor.getCurrentPageShapes() as ReadonlyArray<{
      id: string;
      type: string;
      meta?: { octoNodeId?: string; figureId?: string };
      props?: { label?: string };
    }>;
    const figureShapes = shapes.filter(
      (s) => s.type === "figure-group" && s.meta?.octoNodeId,
    );
    await Promise.all(
      figureShapes.map(async (shape) => {
        const nodeId = shape.meta?.octoNodeId;
        if (!nodeId) return;
        const subgraphDsl = extractFigureSubgraphDsl(canvasDsl, nodeId);
        if (!subgraphDsl) return;
        const title = (shape.props?.label || "").trim() || "Untitled figure";
        const existingId = shape.meta?.figureId;

        if (existingId) {
          // Skip the PATCH if nothing changed since the last sync.
          if (lastSyncedFigureDslRef.current.get(existingId) === subgraphDsl) {
            return;
          }
          try {
            await updateSavedFigureClientApi(existingId, {
              dsl: subgraphDsl,
              title,
            });
            lastSyncedFigureDslRef.current.set(existingId, subgraphDsl);
            // Mirror the just-persisted subgraph onto the shape meta
            // so the title-bar drag handle can carry it in
            // dataTransfer — the note block then renders instantly
            // from the snapshot instead of waiting for a public fetch.
            editor.updateShape({
              id: shape.id as never,
              type: "figure-group",
              meta: { ...(shape.meta ?? {}), figureDsl: subgraphDsl },
            } as never);
          } catch (err) {
            console.error("Figure PATCH failed", err);
          }
          return;
        }

        try {
          const figure = await createSavedFigureClientApi(workspaceId, {
            title,
            dsl: subgraphDsl,
          });
          editor.updateShape({
            id: shape.id as never,
            type: "figure-group",
            meta: {
              ...(shape.meta ?? {}),
              figureId: figure.id,
              figureDsl: subgraphDsl,
            },
          } as never);
          lastSyncedFigureDslRef.current.set(figure.id, subgraphDsl);
        } catch (err) {
          console.error("Figure POST failed", err);
        }
      }),
    );
  }

  /**
   * Save the selected figure-group's subgraph as a standalone Figure
   * row. Returns the saved figure id on success so callers can chain
   * an "insert into note" or "copy URL" action; returns null when any
   * precondition fails (toasts surface the friendly reason).
   *
   * Also persists `figureId` onto the shape's `meta` so the drag
   * handle in the figure title bar knows the figure is saved and can
   * carry the id in dataTransfer for drop-into-note (Phase 3B).
   */
  async function saveSelectedFigure(): Promise<string | null> {
    const editor = editorRef.current;
    if (!editor) return null;
    if (!workspaceId) {
      toast.error("Workspace context missing — can't save figures here.");
      return null;
    }
    // Tldraw's TLShape union is closed over built-ins, so our custom
    // `figure-group` type isn't part of it. Treat the selection as a
    // loose shape record and check `type` / `meta` / `props` ourselves.
    const selected = editor.getSelectedShapes() as ReadonlyArray<{
      id: string;
      type: string;
      meta?: { octoNodeId?: string; figureId?: string };
      props?: { label?: string };
    }>;
    if (selected.length !== 1) {
      toast.message("Select exactly one figure to save.");
      return null;
    }
    const shape = selected[0];
    if (shape.type !== "figure-group") {
      toast.message("Only figure groups can be saved. Use the Figure button to wrap shapes first.");
      return null;
    }
    const nodeId = shape.meta?.octoNodeId;
    if (!nodeId) {
      toast.error("This figure isn't backed by DSL yet — describe it in the From-code drawer first.");
      return null;
    }
    const subgraphDsl = extractFigureSubgraphDsl(dsl, nodeId);
    if (!subgraphDsl) {
      toast.error("Couldn't extract this figure's subgraph from the canvas DSL.");
      return null;
    }
    const title = (shape.props?.label || "").trim() || "Untitled figure";
    try {
      const figure = await createSavedFigureClientApi(workspaceId, {
        title,
        dsl: subgraphDsl,
      });
      // Tldraw shape ids are opaque strings; update the meta with the
      // returned figure id so the drag handle in the figure title bar
      // activates immediately for follow-up drag-and-drop.
      editor.updateShape({
        id: shape.id as never,
        type: "figure-group",
        meta: { ...(shape.meta ?? {}), figureId: figure.id },
      } as never);
      return figure.id;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save figure.");
      return null;
    }
  }

  /**
   * Push the currently-selected figure into the sibling NotesPane.
   * Reads `meta.figureId` (set by the auto-sync) and falls back to
   * an immediate save if the user clicks before the debounced sync
   * has caught up.
   */
  async function insertSelectedFigureIntoNote() {
    if (!onInsertFigureIntoNote) return;
    const editor = editorRef.current;
    if (!editor) return;
    const selected = editor.getSelectedShapes() as ReadonlyArray<{
      id: string;
      type: string;
      meta?: { octoNodeId?: string; figureId?: string };
    }>;
    if (selected.length !== 1) {
      toast.message("Select exactly one figure to insert.");
      return;
    }
    const shape = selected[0];
    if (shape.type !== "figure-group") {
      toast.message("Only figure groups can be inserted into a note.");
      return;
    }
    const existing = shape.meta?.figureId;
    if (existing) {
      onInsertFigureIntoNote(existing);
      return;
    }
    // Race: user clicked before the debounced auto-sync wrote
    // figureId onto the shape's meta. Force-save now.
    const id = await saveSelectedFigure();
    if (id) onInsertFigureIntoNote(id);
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
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              pressed={autoShape}
              onPressedChange={setAutoShape}
              size="sm"
              aria-label="Auto-shape"
              className="size-8 p-0"
            >
              <Shapes className="size-3.5" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Auto-shape — pencil strokes snap to clean shapes</TooltipContent>
        </Tooltip>
        <div className="ml-auto flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={sourceOpen ? "secondary" : "ghost"}
                size="sm"
                className="size-8 p-0"
                onClick={toggleSourceOpen}
                aria-label="Source"
              >
                <Code2 className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Source — toggle the DSL editor</TooltipContent>
          </Tooltip>
          <FromCodeDrawer
            currentDsl={dsl}
            onGenerated={(next) => {
              onDslChange(next);
              if (!sourceOpen) {
                setSourceOpen(true);
                persistSchemaPatch({ sourceOpen: true });
              }
              setFitToken((t) => t + 1);
            }}
          />
          <RefineDiagramDialog
            currentDsl={dsl}
            onRefined={(next) => {
              onDslChange(next);
              if (!sourceOpen) {
                setSourceOpen(true);
                persistSchemaPatch({ sourceOpen: true });
              }
              setFitToken((t) => t + 1);
            }}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0"
                aria-label="Figure"
                onClick={() => {
                  const editor = editorRef.current;
                  if (!editor) return;
                  const id = wrapSelectionInFigure(editor);
                  if (!id) toast.message("Select shapes first to wrap them in a figure.");
                }}
              >
                <Group className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Figure — wrap selected shapes in a group</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0"
                aria-label="Ungroup"
                onClick={() => {
                  const editor = editorRef.current;
                  if (!editor) return;
                  const result = ungroupSelection(editor);
                  if (result.kind === "noop") {
                    toast.message(
                      "Select a figure to dissolve, or shapes inside one to lift them out.",
                    );
                  } else if (result.kind === "dissolved") {
                    toast.success(`Figure dissolved (${result.childCount} shape${result.childCount === 1 ? "" : "s"} kept).`);
                  } else {
                    toast.success(
                      `${result.shapeCount} shape${result.shapeCount === 1 ? "" : "s"} removed from figure.`,
                    );
                  }
                }}
              >
                <Ungroup className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ungroup — dissolve figure or lift shapes out</TooltipContent>
          </Tooltip>
          {workspaceId && onInsertFigureIntoNote ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="size-8 p-0"
                  aria-label="Insert into note"
                  onClick={() => void insertSelectedFigureIntoNote()}
                >
                  <NotebookPen className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Insert into note — embed the selected figure</TooltipContent>
            </Tooltip>
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0"
                aria-label="Re-layout"
                disabled={!dsl.trim()}
                onClick={() => {
                  const next = flipDirection(dsl);
                  if (next === dsl) return;
                  onDslChange(next);
                  setFitToken((t) => t + 1);
                }}
              >
                <LayoutGrid className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Re-layout — cycle direction (right → down → left → up)</TooltipContent>
          </Tooltip>
          <CanvasExportDialog canvasId={canvasId} getEditor={getEditor} />
          {canShare ? (
            <SharePopover
              iconOnly
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
        {sourceOpen ? (
          <DslSidePanel
            value={dsl}
            onChange={onDslChange}
            onClose={toggleSourceOpen}
            language={language}
            onLanguageChange={onLanguageChange}
          />
        ) : null}
        <div className="flex-1 overflow-hidden">
          <OctoCanvas
            canvasId={canvasId}
            initialDocument={initialDocument}
            autoShape={autoShape}
            // OctoCanvas parses via `@octofocus/diagrams` — only feed
            // it the DSL when the chosen flavour is `octo`. Mermaid
            // text is saved but not rendered (no parser yet).
            dsl={language === "octo" ? dsl : ""}
            fitToContent={fitToken}
            onEditorReady={handleEditorReady}
          />
        </div>
      </div>
      <DslDrawer open={dslOpen} onOpenChange={setDslOpen} value={dsl} onChange={onDslChange} />
    </div>
  );
}
