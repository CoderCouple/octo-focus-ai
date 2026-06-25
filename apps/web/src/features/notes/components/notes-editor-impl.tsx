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
import { Code2, Sparkles, Workflow } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { updateNoteAction } from "../actions/notes-actions";
import { CodeBlock } from "./code-block";
import { GenerativeUiBlock } from "./generative-ui-block";
import { LegacyCodeBlock } from "./legacy-code-block";
import { MermaidBlock } from "./mermaid-block";

const SAVE_DEBOUNCE_MS = 1200;

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    mermaid: MermaidBlock(),
    // `codeBlock` accepts inline text content so notes saved before
    // the `richCode` rename still load — without it BlockNote rejects
    // the stored document with "Invalid content for node codeBlock"
    // and the whole editor crashes.
    codeBlock: LegacyCodeBlock(),
    // `richCode` is our rich code block: language picker, copy button,
    // syntax highlighting, resize. The slash menu inserts this going
    // forward.
    richCode: CodeBlock(),
    // Live-rendered React/HTML artifact pasted from the Components
    // studio (or hand-written). Powered by react-live + the iframe
    // artifact renderer.
    generativeUi: GenerativeUiBlock(),
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

export interface NotesEditorProps {
  pageId: string;
  initialContent: unknown;
  view?: "edit" | "raw";
}

export function NotesEditor({ pageId, initialContent, view = "edit" }: NotesEditorProps) {
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
    <div className="bg-card h-full overflow-auto">
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
    </div>
  );
}
