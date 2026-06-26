"use client";

import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";
import { CodeBlock } from "@/features/notes/components/code-block";
import { GenerativeUiBlock } from "@/features/notes/components/generative-ui-block";
import { MermaidBlock } from "@/features/notes/components/mermaid-block";

// Same custom block schema as the editor. Each block checks
// `editor.isEditable` internally and hides the source / edit toggle
// when it's false, so published notes only ever expose the rendered
// view to readers without edit access.
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    mermaid: MermaidBlock(),
    richCode: CodeBlock(),
    generativeUi: GenerativeUiBlock(),
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
