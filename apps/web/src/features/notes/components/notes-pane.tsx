"use client";

import { Code2, FileText } from "lucide-react";
import { useState } from "react";
import type { PageSettings } from "@octofocus/shared";
import { FontPicker, type NoteFont } from "@/components/font-picker";
import { Toggle } from "@/components/ui/toggle";
import { SharePopover, type Visibility } from "@/features/sharing";
import { updateNoteSettingsApi } from "../api/notes-client-api";
import { NotesEditor } from "./notes-editor";

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
}

export function NotesPane({
  pageId,
  initialContent,
  initialSettings,
  noteTitle,
  initialVisibility,
  initialPublicSlug,
  workspaceSlug,
}: NotesPaneProps) {
  const [raw, setRaw] = useState(false);
  const [font, setFont] = useState<NoteFont>(
    (initialSettings.font as NoteFont | undefined) ?? "sans",
  );

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
      <header className="bg-card flex h-10 shrink-0 items-center gap-1 border-b px-3">
        <div className="text-muted-foreground text-xs font-medium">Notes</div>
        <div className="ml-auto flex items-center gap-1">
          <FontPicker value={font} onChange={handleFontChange} />
          <Toggle
            pressed={raw}
            onPressedChange={setRaw}
            size="sm"
            aria-label="Raw markdown"
            title="View raw markdown"
          >
            {raw ? <FileText className="h-3.5 w-3.5" /> : <Code2 className="h-3.5 w-3.5" />}
            {raw ? "Editor" : "Raw"}
          </Toggle>
          {canShare ? (
            <SharePopover
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
        <NotesEditor pageId={pageId} initialContent={initialContent} view={raw ? "raw" : "edit"} />
      </div>
    </div>
  );
}
