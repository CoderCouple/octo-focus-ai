"use client";

import { Code2, FileText } from "lucide-react";
import { useState } from "react";
import { NotesEditor } from "@/app/(workspace)/projects/[id]/_components/notes-editor";
import { Toggle } from "@/components/ui/toggle";

interface NotesPaneProps {
  pageId: string;
  initialContent: unknown;
}

export function NotesPane({ pageId, initialContent }: NotesPaneProps) {
  const [raw, setRaw] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <header className="bg-card flex h-10 shrink-0 items-center gap-1 border-b px-3">
        <div className="text-muted-foreground text-xs font-medium">Notes</div>
        <div className="ml-auto flex items-center gap-1">
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
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <NotesEditor pageId={pageId} initialContent={initialContent} view={raw ? "raw" : "edit"} />
      </div>
    </div>
  );
}
