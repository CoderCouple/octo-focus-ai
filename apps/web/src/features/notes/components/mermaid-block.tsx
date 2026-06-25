"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { Code2, GripHorizontal, GripVertical, Maximize2, Play, Workflow } from "lucide-react";
import mermaid from "mermaid";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const MIN_HEIGHT = 160;
const MAX_HEIGHT = 1200;
const DEFAULT_HEIGHT = 360;
const MIN_WIDTH = 240;
const MAX_WIDTH = 1600;

type ResizeDirection = "horizontal" | "vertical" | "both";

let mermaidInitialized = false;
function ensureMermaidInitialized() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    securityLevel: "loose",
    fontFamily: "inherit",
  });
  mermaidInitialized = true;
}

const DEFAULT_MERMAID = `sequenceDiagram
  participant User
  participant App
  participant API
  participant DB
  User->>App: Submit request
  App->>API: Send data
  API->>DB: Query / update
  DB-->>API: Return result
  API-->>App: Response
  App-->>User: Show result`;

export const mermaidBlockConfig = {
  type: "mermaid" as const,
  propSchema: {
    code: { default: DEFAULT_MERMAID },
    height: { default: DEFAULT_HEIGHT },
    width: { default: 0 },
  },
  content: "none" as const,
};

export const MermaidBlock = createReactBlockSpec(mermaidBlockConfig, {
  toExternalHTML: ({ block }) => (
    <pre>
      <code className="language-mermaid">{block.props.code as string}</code>
    </pre>
  ),
  render: ({ block, editor }) => {
    const code = block.props.code as string;
    const persistedHeight = (block.props.height as number) ?? DEFAULT_HEIGHT;
    const persistedWidth = (block.props.width as number) ?? 0;
    // Read-only view (published note, share link without edit) — hides
    // the source / re-render buttons and the resize handles so readers
    // only see the rendered diagram. Fullscreen stays available.
    const isEditable = editor.isEditable;
    const [view, setView] = useState<"diagram" | "source">("diagram");
    const [svg, setSvg] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [fullscreen, setFullscreen] = useState(false);
    const [liveSize, setLiveSize] = useState<{ width: number; height: number } | null>(null);
    const idRef = useRef(`m-${block.id}-${Math.random().toString(36).slice(2, 8)}`);

    const currentHeight = liveSize?.height ?? persistedHeight;
    const currentWidth = liveSize?.width ?? persistedWidth;

    useEffect(() => {
      if (view !== "diagram") return;
      ensureMermaidInitialized();
      let cancelled = false;
      mermaid
        .render(idRef.current, code)
        .then(({ svg }) => {
          if (cancelled) return;
          setSvg(svg);
          setError(null);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : String(err));
        });
      return () => {
        cancelled = true;
      };
    }, [code, view]);

    function rerender() {
      setView("diagram");
      setSvg("");
      ensureMermaidInitialized();
      idRef.current = `m-${block.id}-${Math.random().toString(36).slice(2, 8)}`;
      mermaid
        .render(idRef.current, code)
        .then(({ svg }) => {
          setSvg(svg);
          setError(null);
        })
        .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
    }

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
        direction === "horizontal" ? "ew-resize" : direction === "vertical" ? "ns-resize" : "nwse-resize";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    }

    const widthStyle: React.CSSProperties = {
      maxWidth: "100%",
      ...(!fullscreen && currentWidth > 0 ? { width: currentWidth } : {}),
    };

    const content = (
      <div
        className="bg-card group relative w-full max-w-full overflow-hidden rounded-xl border"
        style={widthStyle}
      >
        <header className="flex items-center justify-between border-b px-3 py-2">
          <div className="text-foreground flex items-center gap-2 text-sm font-medium">
            <Workflow className="h-4 w-4" />
            Mermaid
          </div>
          <div className="flex items-center gap-1">
            {isEditable ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setView((v) => (v === "diagram" ? "source" : "diagram"))}
                  title={view === "diagram" ? "Edit source" : "View diagram"}
                >
                  <Code2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={rerender}
                  title="Re-render"
                >
                  <Play className="h-4 w-4" />
                </Button>
              </>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setFullscreen((f) => !f)}
              title="Fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <div
          className="bg-muted/30 relative overflow-hidden"
          style={{ height: fullscreen ? undefined : currentHeight }}
        >
          {!isEditable || view === "diagram" ? (
            error ? (
              <pre className="text-destructive overflow-auto p-4 text-xs whitespace-pre-wrap">
                {error}
              </pre>
            ) : svg ? (
              <div
                className="h-full overflow-auto p-4 [&>svg]:mx-auto [&>svg]:block [&>svg]:max-h-full [&>svg]:max-w-full"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              <div className="text-muted-foreground p-6 text-sm">Rendering…</div>
            )
          ) : (
            <textarea
              value={code}
              onChange={(e) => editor.updateBlock(block, { props: { code: e.target.value } })}
              spellCheck={false}
              className="h-full w-full resize-none rounded-none border-0 bg-transparent p-4 font-mono text-sm focus:outline-none"
            />
          )}
        </div>
        {!fullscreen && isEditable && (
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
        )}
      </div>
    );

    if (fullscreen) {
      return (
        <div
          className="bg-background/80 fixed inset-0 z-50 grid place-items-center p-6 backdrop-blur-sm"
          onClick={() => setFullscreen(false)}
        >
          <div
            className="bg-card max-h-full w-full max-w-5xl overflow-auto rounded-xl border shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </div>
        </div>
      );
    }

    return content;
  },
});
