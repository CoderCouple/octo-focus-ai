"use client";

import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";
import { MermaidBlock } from "@/features/notes/components/mermaid-block";

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    mermaid: MermaidBlock(),
  },
});

export interface NotesReadOnlyImplProps {
  initialContent: unknown;
}

export function NotesReadOnlyImpl({ initialContent }: NotesReadOnlyImplProps) {
  const initialBlocks =
    initialContent &&
    typeof initialContent === "object" &&
    Array.isArray((initialContent as { blocks?: unknown }).blocks)
      ? ((initialContent as { blocks: unknown[] }).blocks as never)
      : undefined;

  const editor = useCreateBlockNote({ schema, initialContent: initialBlocks });

  return (
    <div className="bg-background h-full overflow-auto">
      <BlockNoteView editor={editor} editable={false} slashMenu={false} sideMenu={false} />
    </div>
  );
}
