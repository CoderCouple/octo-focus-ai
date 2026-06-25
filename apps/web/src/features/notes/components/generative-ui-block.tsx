"use client";

import { createReactBlockSpec } from "@blocknote/react";
import {
  Check,
  Code2,
  Copy,
  Eye,
  GripHorizontal,
  GripVertical,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as React from "react";
import { IframeArtifact } from "@/features/components";
import { Button } from "@/components/ui/button";
import { ComponentRefineOverlay } from "./component-refine-overlay";

const MIN_HEIGHT = 160;
const MAX_HEIGHT = 1400;
const DEFAULT_HEIGHT = 360;
const MIN_WIDTH = 280;
const MAX_WIDTH = 1600;

type ResizeDirection = "horizontal" | "vertical" | "both";

const DEFAULT_CODE = `function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <button
        onClick={() => setCount(count + 1)}
        className="rounded-full bg-indigo-500 hover:bg-indigo-400 px-6 py-3 text-lg font-semibold shadow-lg shadow-indigo-500/30 transition"
      >
        Clicked {count} times
      </button>
    </div>
  );
}`;

export const generativeUiBlockConfig = {
  type: "generativeUi" as const,
  propSchema: {
    // When `componentId` is set the block fetches the latest code
    // from `/v1/public/components/<id>` on render. `code` doubles as
    // an inline snapshot fallback that keeps the embed working when
    // the source component is deleted or the network fails. New
    // blocks created by the URL paste handler set both fields.
    componentId: { default: "" },
    code: { default: DEFAULT_CODE },
    height: { default: DEFAULT_HEIGHT },
    width: { default: 0 },
  },
  content: "none" as const,
};

/**
 * Generative UI block — embeds a Claude-artifact-style live preview of
 * a React + TypeScript component in a note. Powered by IframeArtifact:
 * a sandboxed iframe with Tailwind CDN preloaded, so the component
 * gets full Tailwind freedom + style isolation from the host note.
 *
 * Header has live preview / source toggle + copy. Resize handles match
 * the CodeBlock / MermaidBlock so the three embeds feel cohesive.
 */
export const GenerativeUiBlock = createReactBlockSpec(generativeUiBlockConfig, {
  toExternalHTML: ({ block }) => (
    <pre>
      <code className="language-tsx">{block.props.code as string}</code>
    </pre>
  ),
  render: ({ block, editor }) => {
    const snapshotCode = (block.props.code as string) ?? DEFAULT_CODE;
    const componentId = (block.props.componentId as string) || "";
    const persistedHeight = (block.props.height as number) ?? DEFAULT_HEIGHT;
    const persistedWidth = (block.props.width as number) ?? 0;
    // Read-only view (published note, share link without edit) — the
    // source toggle, textarea, copy button, and resize handles are all
    // hidden so readers only see the rendered artifact.
    const isEditable = editor.isEditable;

    const [view, setView] = useState<"preview" | "source">("preview");
    const [copied, setCopied] = useState(false);
    const [liveSize, setLiveSize] = useState<{ width: number; height: number } | null>(null);
    const [fetched, setFetched] = useState<string | null>(null);
    const [fetching, setFetching] = useState(componentId.length > 0);
    const [refining, setRefining] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Resolve which code to render. Reference (componentId) wins when
    // available; otherwise we fall back to the inline snapshot the
    // block carries. The snapshot is updated to match every successful
    // fetch so deletions / network failures keep rendering the last
    // known good version.
    const code = fetched ?? snapshotCode;

    useEffect(() => {
      if (!componentId) {
        setFetching(false);
        return;
      }
      let cancelled = false;
      setFetching(true);
      void (async () => {
        try {
          const { getPublicComponentClientApi } = await import(
            "@/features/components"
          );
          const result = await getPublicComponentClientApi(componentId);
          if (cancelled) return;
          if (result?.code) {
            setFetched(result.code);
            // Refresh the snapshot in the block so the note still
            // renders correctly offline / after deletion.
            if (isEditable && result.code !== snapshotCode) {
              editor.updateBlock(block, { props: { code: result.code } });
            }
          }
        } catch {
          // Snapshot fallback is already in effect.
        } finally {
          if (!cancelled) setFetching(false);
        }
      })();
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [componentId]);

    const currentHeight = liveSize?.height ?? persistedHeight;
    const currentWidth = liveSize?.width ?? persistedWidth;

    useEffect(() => {
      return () => {
        if (copyTimer.current) clearTimeout(copyTimer.current);
      };
    }, []);

    useEffect(() => {
      if (view === "source") textareaRef.current?.focus();
    }, [view]);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        if (copyTimer.current) clearTimeout(copyTimer.current);
        copyTimer.current = setTimeout(() => setCopied(false), 1500);
      } catch {
        // ignore
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
          const base = startW > 0 ? startW : 700;
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
            <Sparkles className="h-4 w-4" />
            Component
          </div>
          {isEditable ? (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="default"
                className="h-7 gap-1.5 px-2.5"
                onClick={() => setRefining(true)}
                title="Refine with AI"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Refine
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopy}
                title="Copy code"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setView((v) => (v === "preview" ? "source" : "preview"))}
                title={view === "preview" ? "Edit source" : "Preview"}
              >
                {view === "preview" ? (
                  <Code2 className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          ) : null}
        </header>
        <div className="bg-muted/30 relative overflow-hidden" style={{ height: currentHeight }}>
          {!isEditable || view === "preview" ? (
            <IframeArtifact code={code} className="h-full" />
          ) : (
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) =>
                editor.updateBlock(block, { props: { code: e.target.value } })
              }
              spellCheck={false}
              placeholder="Paste a TSX component here…"
              className="h-full w-full resize-none rounded-none border-0 bg-transparent p-3 font-mono text-[0.85rem] leading-relaxed focus:outline-none"
            />
          )}
        </div>
        {isEditable && refining ? (
          <ComponentRefineOverlay
            code={code}
            componentId={componentId || undefined}
            onApply={(next) => {
              setFetched(next);
              editor.updateBlock(block, { props: { code: next } });
            }}
            onClose={() => setRefining(false)}
          />
        ) : null}
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
