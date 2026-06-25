"use client";

import { createReactBlockSpec } from "@blocknote/react";
import hljs from "highlight.js/lib/common";
import "highlight.js/styles/atom-one-light.css";
import { Check, Code2, Copy, GripHorizontal, GripVertical, Pencil } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MIN_HEIGHT = 100;
const MAX_HEIGHT = 1200;
const DEFAULT_HEIGHT = 240;
const MIN_WIDTH = 240;
const MAX_WIDTH = 1600;

type ResizeDirection = "horizontal" | "vertical" | "both";

// highlight.js/lib/common ships ~35 popular languages already registered.
// These are the ones we surface in the picker — the value matches the
// hljs alias so `hljs.highlight(code, { language })` resolves cleanly.
const LANGUAGES: { value: string; label: string }[] = [
  { value: "plaintext", label: "Plain text" },
  { value: "bash", label: "Bash" },
  { value: "css", label: "CSS" },
  { value: "go", label: "Go" },
  { value: "xml", label: "HTML / XML" },
  { value: "java", label: "Java" },
  { value: "javascript", label: "JavaScript" },
  { value: "json", label: "JSON" },
  { value: "markdown", label: "Markdown" },
  { value: "python", label: "Python" },
  { value: "rust", label: "Rust" },
  { value: "sql", label: "SQL" },
  { value: "swift", label: "Swift" },
  { value: "typescript", label: "TypeScript" },
  { value: "yaml", label: "YAML" },
];

const DEFAULT_LANGUAGE = "javascript";

export const codeBlockConfig = {
  type: "richCode" as const,
  propSchema: {
    code: { default: "" },
    language: { default: DEFAULT_LANGUAGE },
    height: { default: DEFAULT_HEIGHT },
    width: { default: 0 },
  },
  content: "none" as const,
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function highlight(code: string, language: string): string {
  if (!code) return "";
  if (language === "plaintext") return escapeHtml(code);
  try {
    return hljs.highlight(code, { language, ignoreIllegals: true }).value;
  } catch {
    return escapeHtml(code);
  }
}

/**
 * Custom code block. Overrides BlockNote's default `codeBlock` with a
 * richer chrome: language picker + copy button in the header, syntax
 * highlighting via highlight.js (BSD-3, ~35 common languages already
 * registered via the `common` bundle), and the same resize handles as
 * MermaidBlock so the two embeds feel cohesive.
 *
 * Persists `code`, `language`, `height`, `width` on the block props.
 * Markdown export wraps the snippet in a fenced ` ```<lang> ` block so
 * raw view + AI prompts get clean output.
 */
export const CodeBlock = createReactBlockSpec(codeBlockConfig, {
  toExternalHTML: ({ block }) => {
    const code = block.props.code as string;
    const language = (block.props.language as string) || "";
    return (
      <pre>
        <code className={language ? `language-${language}` : undefined}>{code}</code>
      </pre>
    );
  },
  render: ({ block, editor }) => {
    const code = (block.props.code as string) ?? "";
    const language = (block.props.language as string) || DEFAULT_LANGUAGE;
    const persistedHeight = (block.props.height as number) ?? DEFAULT_HEIGHT;
    const persistedWidth = (block.props.width as number) ?? 0;
    // Read-only view (published note, share link without edit) — the
    // language picker and edit / preview toggle are hidden; the
    // highlighted preview is forced. Copy stays because viewing-with-
    // copy is what published code blocks are for.
    const isEditable = editor.isEditable;

    const [view, setView] = useState<"preview" | "edit">(
      !isEditable || code.length > 0 ? "preview" : "edit",
    );
    const [copied, setCopied] = useState(false);
    const [liveSize, setLiveSize] = useState<{ width: number; height: number } | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const currentHeight = liveSize?.height ?? persistedHeight;
    const currentWidth = liveSize?.width ?? persistedWidth;

    // Memoize so we're not re-tokenizing on every render — only when
    // code/language actually change.
    const highlighted = useMemo(() => highlight(code, language), [code, language]);

    useEffect(() => {
      return () => {
        if (copyTimer.current) clearTimeout(copyTimer.current);
      };
    }, []);

    useEffect(() => {
      if (view === "edit") textareaRef.current?.focus();
    }, [view]);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        if (copyTimer.current) clearTimeout(copyTimer.current);
        copyTimer.current = setTimeout(() => setCopied(false), 1500);
      } catch {
        // Clipboard API can fail in insecure contexts — silently ignore.
      }
    };

    function startResize(direction: ResizeDirection, event: React.MouseEvent) {
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startY = event.clientY;
      const startW = currentWidth > 0 ? currentWidth : 0;
      const startH = currentHeight;
      let finalW = startW;
      let finalH = startH;

      const onMove = (ev: MouseEvent) => {
        if (direction !== "vertical") {
          const base = startW > 0 ? startW : 600;
          finalW = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, base + (ev.clientX - startX)));
        }
        if (direction !== "horizontal") {
          finalH = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startH + (ev.clientY - startY)));
        }
        setLiveSize({ width: finalW, height: finalH });
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        setLiveSize(null);
        const updates: Record<string, number> = {};
        if (direction !== "vertical") updates.width = finalW;
        if (direction !== "horizontal") updates.height = finalH;
        editor.updateBlock(block, { props: updates });
      };

      document.body.style.cursor =
        direction === "horizontal"
          ? "ew-resize"
          : direction === "vertical"
            ? "ns-resize"
            : "nwse-resize";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    }

    const widthStyle: React.CSSProperties = {
      maxWidth: "100%",
      ...(currentWidth > 0 ? { width: currentWidth } : {}),
    };

    return (
      <div
        className="bg-card group relative w-full max-w-full overflow-hidden rounded-xl border"
        style={widthStyle}
      >
        <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <div className="text-foreground flex items-center gap-2 text-sm font-medium">
            <Code2 className="h-4 w-4" />
            {isEditable ? (
              <Select
                value={language}
                onValueChange={(value) =>
                  editor.updateBlock(block, { props: { language: value } })
                }
              >
                <SelectTrigger
                  size="sm"
                  className="h-7 border-0 bg-transparent px-2 shadow-none focus:ring-0 focus-visible:ring-0"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-muted-foreground px-1 text-xs capitalize">
                {LANGUAGES.find((l) => l.value === language)?.label ?? language}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopy}
              title="Copy code"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            {isEditable ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setView((v) => (v === "preview" ? "edit" : "preview"))}
                title={view === "preview" ? "Edit code" : "Preview"}
              >
                {view === "preview" ? (
                  <Pencil className="h-4 w-4" />
                ) : (
                  <Code2 className="h-4 w-4" />
                )}
              </Button>
            ) : null}
          </div>
        </header>
        <div
          className="bg-muted/30 relative overflow-hidden"
          style={{ height: currentHeight }}
        >
          {view === "preview" ? (
            <pre
              className="hljs h-full overflow-auto p-3 font-mono text-[0.85rem] leading-relaxed"
              onDoubleClick={() => isEditable && setView("edit")}
              title={isEditable ? "Double-click to edit" : undefined}
            >
              <code
                className={`language-${language}`}
                dangerouslySetInnerHTML={{ __html: highlighted || " " }}
              />
            </pre>
          ) : (
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => editor.updateBlock(block, { props: { code: e.target.value } })}
              onBlur={() => {
                if (code.trim().length > 0) setView("preview");
              }}
              spellCheck={false}
              placeholder="Type or paste code…"
              className="h-full w-full resize-none rounded-none border-0 bg-transparent p-3 font-mono text-[0.85rem] leading-relaxed focus:outline-none"
            />
          )}
        </div>
        {isEditable ? (
          <>
            <div
              role="separator"
              aria-orientation="vertical"
              onMouseDown={(e) => startResize("horizontal", e)}
              className="hover:bg-accent absolute top-12 bottom-3 right-0 flex w-2 cursor-ew-resize items-center justify-center border-l opacity-0 transition-opacity group-hover:opacity-100"
              title="Drag to resize width"
            >
              <GripVertical className="text-muted-foreground h-3 w-3" />
            </div>
            <div
              role="separator"
              aria-orientation="horizontal"
              onMouseDown={(e) => startResize("vertical", e)}
              className="hover:bg-accent absolute right-3 bottom-0 left-0 flex h-2 cursor-ns-resize items-center justify-center border-t opacity-0 transition-opacity group-hover:opacity-100"
              title="Drag to resize height"
            >
              <GripHorizontal className="text-muted-foreground h-3 w-3" />
            </div>
            <div
              role="separator"
              aria-label="Resize"
              onMouseDown={(e) => startResize("both", e)}
              className="hover:bg-accent absolute right-0 bottom-0 grid h-3 w-3 cursor-nwse-resize place-items-center opacity-0 transition-opacity group-hover:opacity-100"
              title="Drag to resize"
            >
              <span className="text-muted-foreground text-[10px] leading-none">⤡</span>
            </div>
          </>
        ) : null}
      </div>
    );
  },
});
