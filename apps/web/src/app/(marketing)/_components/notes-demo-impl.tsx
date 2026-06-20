"use client";

import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";

const schema = BlockNoteSchema.create({
  blockSpecs: defaultBlockSpecs,
});

const INITIAL_BLOCKS = [
  { type: "heading", props: { level: 1 }, content: "Architecture notes" },
  {
    type: "paragraph",
    content: "Block-based editor. Type / to insert blocks. Drag the handle to reorder.",
  },
  { type: "heading", props: { level: 2 }, content: "Plan" },
  { type: "bulletListItem", content: "Browser hits the API over HTTPS" },
  { type: "bulletListItem", content: "API queries Postgres and reads Redis" },
  { type: "bulletListItem", content: "Heavy work goes to a background queue" },
] as never;

export function NotesDemo() {
  const editor = useCreateBlockNote({
    schema,
    initialContent: INITIAL_BLOCKS,
  });

  return (
    <div className="border-border/60 bg-card/40 overflow-hidden rounded-2xl border shadow-2xl backdrop-blur">
      <div className="text-muted-foreground border-border/60 flex items-center gap-2 border-b px-4 py-2 text-xs font-medium tracking-wider uppercase">
        Notes
      </div>
      <div className="bg-card max-h-[480px] overflow-auto">
        <BlockNoteView editor={editor} />
      </div>
    </div>
  );
}
