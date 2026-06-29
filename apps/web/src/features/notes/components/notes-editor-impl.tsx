"use client";

import {
  BlockNoteSchema,
  defaultBlockSpecs,
  filterSuggestionItems,
  type BlockNoteEditor,
} from "@blocknote/core";
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
  type DefaultReactSuggestionItem,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";
import { Code2, Frame, Sparkles, Workflow } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as React from "react";
import { FigurePickerDialog } from "@/features/figures";
import { updateNoteAction } from "../actions/notes-actions";
import { parseEmbedUrl } from "../lib/parse-embed-url";
import { CodeBlock } from "./code-block";
import { FigureBlock } from "./figure-block";
import { GenerativeUiBlock } from "./generative-ui-block";
import { MermaidBlock } from "./mermaid-block";
import { TableOfContentsRail } from "./table-of-contents-rail";

const SAVE_DEBOUNCE_MS = 1200;

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    mermaid: MermaidBlock(),
    // ONE code block everywhere — `richCode`. Legacy `codeBlock`
    // instances stored in old notes are rewritten to `richCode` by
    // `migrateBlocks` BEFORE the editor sees them, so we no longer
    // register a back-compat spec under `codeBlock`.
    richCode: CodeBlock(),
    // Live-rendered React/HTML artifact pasted from the Components
    // studio (or hand-written). Powered by react-live + the iframe
    // artifact renderer.
    generativeUi: GenerativeUiBlock(),
    // Embedded canvas figure — rendered via the same read-only tldraw
    // path the /f/<id> public page uses. Pasted from the canvas
    // "Save figure" flow or inserted via the slash menu.
    figure: FigureBlock(),
  },
});

type OctoEditor = BlockNoteEditor<
  typeof schema.blockSchema,
  typeof schema.inlineContentSchema,
  typeof schema.styleSchema
>;

function insertMermaidItem(editor: OctoEditor): DefaultReactSuggestionItem {
  return {
    title: "Mermaid",
    subtext: "Insert a Mermaid diagram block",
    aliases: ["mermaid", "diagram", "chart", "graph"],
    group: "Embeds",
    icon: <Workflow className="h-4 w-4" />,
    onItemClick: () => {
      const current = editor.getTextCursorPosition().block;
      editor.replaceBlocks([current], [{ type: "mermaid" }]);
    },
  };
}

function insertCodeItem(editor: OctoEditor): DefaultReactSuggestionItem {
  return {
    title: "Code block",
    subtext: "Insert a syntax-highlighted code block",
    aliases: ["code", "snippet", "syntax"],
    group: "Embeds",
    icon: <Code2 className="h-4 w-4" />,
    onItemClick: () => {
      const current = editor.getTextCursorPosition().block;
      editor.replaceBlocks([current], [{ type: "richCode" }]);
    },
  };
}

function insertGenerativeUiItem(editor: OctoEditor): DefaultReactSuggestionItem {
  return {
    title: "Component",
    subtext: "Embed a live-rendered React component",
    aliases: ["component", "ui", "live", "react", "generative"],
    group: "Embeds",
    icon: <Sparkles className="h-4 w-4" />,
    onItemClick: () => {
      const current = editor.getTextCursorPosition().block;
      editor.replaceBlocks([current], [{ type: "generativeUi" }]);
    },
  };
}

/**
 * When `workspaceId` is available, the slash menu's Figure item opens
 * the workspace picker via `onOpenPicker`. Without a workspaceId
 * (e.g. read-only contexts, published note views) we fall back to
 * inserting an empty figure block so the user can paste a URL.
 */
function insertFigureItem(
  editor: OctoEditor,
  onOpenPicker: (() => void) | null,
): DefaultReactSuggestionItem {
  return {
    title: "Figure",
    subtext: "Embed a saved canvas figure",
    aliases: ["figure", "diagram", "canvas", "subgraph"],
    group: "Embeds",
    icon: <Frame className="h-4 w-4" />,
    onItemClick: () => {
      if (onOpenPicker) {
        onOpenPicker();
        return;
      }
      const current = editor.getTextCursorPosition().block;
      editor.replaceBlocks([current], [{ type: "figure" }]);
    },
  };
}

/** Imperative handle exposed via the `onEditorReady` callback. */
export interface NotesEditorHandle {
  /** Insert a figure block referencing a saved figure id at the cursor. */
  insertFigureBlock: (figureId: string) => void;
}

export interface NotesEditorProps {
  pageId: string;
  initialContent: unknown;
  view?: "edit" | "raw";
  /** Required for the `/Figure` slash menu picker and drop-to-save. */
  workspaceId?: string;
  /**
   * Called once on mount with the imperative editor handle so a
   * sibling pane (e.g. CanvasPane in the split view) can push blocks
   * into the editor without going through the clipboard.
   */
  onEditorReady?: (handle: NotesEditorHandle) => void;
}

export function NotesEditor({
  pageId,
  initialContent,
  view = "edit",
  workspaceId,
  onEditorReady,
}: NotesEditorProps) {
  const initialBlocks =
    initialContent &&
    typeof initialContent === "object" &&
    Array.isArray((initialContent as { blocks?: unknown }).blocks)
      ? ((initialContent as { blocks: unknown[] }).blocks as never)
      : undefined;

  const editor = useCreateBlockNote({
    schema,
    initialContent: initialBlocks,
  });

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rawMd, setRawMd] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState(false);

  /** Imperative figure-block insertion — shared by the picker, the
   * "Insert into note" button from CanvasPane, and the drop handler. */
  function insertFigureBlockById(figureId: string, dslSnapshot?: string) {
    const current = editor.getTextCursorPosition().block;
    editor.replaceBlocks(
      [current],
      [
        {
          type: "figure",
          props: dslSnapshot ? { figureId, dsl: dslSnapshot } : { figureId },
        },
      ],
    );
  }

  // Hand out the imperative handle so the parent split view can push
  // blocks in from the canvas.
  useEffect(() => {
    if (!onEditorReady) return;
    onEditorReady({ insertFigureBlock: insertFigureBlockById });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onEditorReady]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  useEffect(() => {
    if (view !== "raw") return;
    const id = setTimeout(() => {
      try {
        setRawMd(editor.blocksToMarkdownLossy(editor.document));
      } catch (err) {
        console.error("Markdown conversion failed", err);
        setRawMd(`Failed to convert: ${err instanceof Error ? err.message : String(err)}`);
      }
    }, 0);
    return () => clearTimeout(id);
  }, [view, editor]);

  /**
   * Capture-phase paste handler — runs BEFORE BlockNote's
   * contentEditable hears the paste, so calling `preventDefault` +
   * `stopPropagation` here actually prevents the URL from
   * auto-linkifying. The earlier bubble-phase listener ran AFTER
   * BlockNote had already inserted a hyperlink, which is why the
   * figure URL showed up as a clickable link instead of an embed.
   *
   * Two embed URL shapes are recognised:
   *   - `/c/<cmp_...>` → Components artifact (generativeUi block)
   *   - `/f/<fig_...>` → Saved canvas figure (figure block)
   */
  function onPasteCapture(event: React.ClipboardEvent<HTMLDivElement>) {
    const text = event.clipboardData?.getData("text/plain") ?? "";
    const target = parseEmbedUrl(text);
    if (!target) return;

    event.preventDefault();
    event.stopPropagation();
    const current = editor.getTextCursorPosition().block;

    if (target.kind === "component") {
      editor.replaceBlocks(
        [current],
        [{ type: "generativeUi", props: { componentId: target.id } }],
      );
    } else {
      editor.replaceBlocks(
        [current],
        [{ type: "figure", props: { figureId: target.id } }],
      );
    }
  }

  /**
   * Capture-phase drop handler — recognises figure ids dragged from a
   * canvas figure-group's title handle. Prefers the custom mime type
   * (most reliable), falls back to the text/plain URL which the drag
   * source also sets (covers cross-frame strip-down). Falls through
   * to BlockNote's default drop behaviour for anything else.
   */
  /**
   * Mark drag-overs as a copy so the browser doesn't treat the
   * gesture as a move and prompt the source (the canvas) to delete
   * its shape on dragend. Also tells the browser the editor will
   * accept the drop — without `preventDefault()` here, native drop
   * never fires.
   */
  function onDragOverCapture(event: React.DragEvent<HTMLDivElement>) {
    const types = event.dataTransfer?.types;
    if (!types) return;
    if (
      types.includes("application/x-octofocus-figure-id") ||
      types.includes("application/x-octofocus-figure-dsl")
    ) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  }

  function onDropCapture(event: React.DragEvent<HTMLDivElement>) {
    const figureId = event.dataTransfer?.getData("application/x-octofocus-figure-id");
    if (figureId && /^fig_[A-Za-z0-9_-]+$/.test(figureId)) {
      event.preventDefault();
      event.stopPropagation();
      // Optional subgraph DSL set by the canvas drag source —
      // unblocks instant render on drop. Falls back to the figure
      // block's public-fetch path when absent.
      const dslSnapshot =
        event.dataTransfer?.getData("application/x-octofocus-figure-dsl") || undefined;
      insertFigureBlockById(figureId, dslSnapshot);
      return;
    }
    const text = event.dataTransfer?.getData("text/plain") ?? "";
    const target = parseEmbedUrl(text);
    if (target?.kind === "figure") {
      event.preventDefault();
      event.stopPropagation();
      insertFigureBlockById(target.id);
    }
  }

  function onChange() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const blocks = editor.document;
      let contentMd = "";
      try {
        contentMd = editor.blocksToMarkdownLossy(blocks);
      } catch (err) {
        console.error("Markdown conversion failed", err);
      }
      void updateNoteAction(pageId, { document: { blocks }, contentMd }).then((r) => {
        if (!r.success) console.error("Page save failed", r.message);
      });
    }, SAVE_DEBOUNCE_MS);
  }

  return (
    <div
      className="bg-card relative h-full overflow-auto"
      onPasteCapture={onPasteCapture}
      onDragOverCapture={onDragOverCapture}
      onDropCapture={onDropCapture}
    >
      {view === "edit" ? (
        <TableOfContentsRail editor={editor as never} />
      ) : null}
      <div className={view === "raw" ? "hidden" : "contents"}>
        <BlockNoteView editor={editor} onChange={onChange} slashMenu={false}>
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) =>
              filterSuggestionItems(
                [
                  ...getDefaultReactSlashMenuItems(editor),
                  insertMermaidItem(editor),
                  insertCodeItem(editor),
                  insertGenerativeUiItem(editor),
                  insertFigureItem(
                    editor,
                    workspaceId ? () => setPickerOpen(true) : null,
                  ),
                ],
                query,
              )
            }
          />
        </BlockNoteView>
      </div>
      {view === "raw" && (
        <pre className="text-foreground h-full overflow-auto p-6 font-mono text-sm whitespace-pre-wrap">
          {rawMd}
        </pre>
      )}
      {workspaceId ? (
        <FigurePickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          workspaceId={workspaceId}
          onPick={(figureId) => insertFigureBlockById(figureId)}
        />
      ) : null}
    </div>
  );
}
