"use client";

import { ArrowLeft, Code2, FileText, Focus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import type { PageSettings } from "@octofocus/shared";
import { EditableTitle } from "@/components/editable-title";
import { FontPicker, type NoteFont } from "@/components/font-picker";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SharePopover, type Visibility } from "@/features/sharing";
import { updateNoteClientApi, updateNoteSettingsApi } from "../api/notes-client-api";
import { NotesEditor } from "./notes-editor";
import type { NotesEditorHandle } from "./notes-editor-impl";

export type { NotesEditorHandle };

interface NotesPaneProps {
  pageId: string;
  initialContent: unknown;
  initialSettings: PageSettings;
  /**
   * Per-note publish props. When provided, surfaces a Share popover in
   * the header that publishes THIS note independently of any parent
   * project. Omit when share lives elsewhere on the page.
   */
  noteTitle?: string;
  initialVisibility?: Visibility;
  initialPublicSlug?: string | null;
  workspaceSlug?: string;
  /**
   * Required for the `/Figure` slash menu and the figure block save
   * fallback — both POST to a workspace-scoped endpoint. Optional so
   * existing call sites (and the published read-only view) don't
   * break; the slash menu just hides the picker when absent.
   */
  workspaceId?: string;
  /**
   * When set, the pane renders a small X close link at the very start
   * of its header (before the title). Used by the focus route so the
   * close affordance sits inline with the title chrome instead of
   * floating on top of the editor.
   */
  closeHref?: string;
  /**
   * Imperative editor handle handed back to the parent so other panes
   * (e.g. CanvasPane in the split view) can push blocks into the
   * notes editor without going through the clipboard.
   */
  onEditorReady?: (handle: NotesEditorHandle) => void;
}

export function NotesPane({
  pageId,
  initialContent,
  initialSettings,
  noteTitle,
  initialVisibility,
  initialPublicSlug,
  workspaceSlug,
  workspaceId,
  closeHref,
  onEditorReady,
}: NotesPaneProps) {
  const [raw, setRaw] = useState(false);
  const [font, setFont] = useState<NoteFont>(
    (initialSettings.font as NoteFont | undefined) ?? "sans",
  );
  const [title, setTitle] = useState(noteTitle ?? "");

  const handleRename = async (next: string) => {
    setTitle(next);
    try {
      await updateNoteClientApi(pageId, { title: next });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename");
    }
  };

  const handleFontChange = async (next: NoteFont) => {
    setFont(next);
    // Fire-and-forget; the UI is already optimistic. Errors surface in console.
    void updateNoteSettingsApi(pageId, { ...initialSettings, font: next }).catch((err) => {
      console.error("Failed to persist font", err);
    });
  };

  const canShare =
    initialVisibility !== undefined && workspaceSlug !== undefined && noteTitle !== undefined;

  return (
    <div className="flex h-full flex-col">
      <header className="bg-card flex h-10 shrink-0 items-center gap-2 border-b px-3">
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
        {noteTitle !== undefined ? (
          <EditableTitle value={title} onSave={handleRename} placeholder="Untitled note" />
        ) : (
          <div className="text-muted-foreground text-xs font-medium">Notes</div>
        )}
        <div className="ml-auto flex items-center gap-1">
          <FontPicker value={font} onChange={handleFontChange} />
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                pressed={raw}
                onPressedChange={setRaw}
                size="sm"
                aria-label={raw ? "Editor" : "Raw markdown"}
                className="size-8 p-0"
              >
                {raw ? <FileText className="size-3.5" /> : <Code2 className="size-3.5" />}
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>
              {raw ? "Editor — back to the rich editor" : "Raw — view the underlying markdown"}
            </TooltipContent>
          </Tooltip>
          {canShare ? (
            <SharePopover
              iconOnly
              resourceKind="page"
              resourceId={pageId}
              resourceTitle={noteTitle!}
              initialVisibility={initialVisibility!}
              initialPublicSlug={initialPublicSlug ?? null}
              workspaceSlug={workspaceSlug!}
            />
          ) : null}
        </div>
      </header>
      <div className="flex-1 overflow-hidden" data-notes-font={font}>
        <NotesEditor
          pageId={pageId}
          initialContent={initialContent}
          view={raw ? "raw" : "edit"}
          workspaceId={workspaceId}
          onEditorReady={onEditorReady}
        />
      </div>
    </div>
  );
}
