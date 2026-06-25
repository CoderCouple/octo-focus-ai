"use client";

import { createReactBlockSpec } from "@blocknote/react";
import hljs from "highlight.js/lib/common";
import "highlight.js/styles/atom-one-light.css";
import {
  Check,
  Code2,
  Copy,
  Eye,
  GripHorizontal,
  GripVertical,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as React from "react";
import { LiveError, LivePreview, LiveProvider } from "react-live";
import { normalizeForLive } from "@/features/components/lib/normalize-for-live";
import { Button } from "@/components/ui/button";

const MIN_HEIGHT = 160;
const MAX_HEIGHT = 1400;
const DEFAULT_HEIGHT = 320;
const MIN_WIDTH = 280;
const MAX_WIDTH = 1600;

type ResizeDirection = "horizontal" | "vertical" | "both";

const DEFAULT_CODE = `function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button
      onClick={() => setCount(count + 1)}
      className="border border-black px-4 py-2 rounded-md font-medium"
    >
      Clicked {count} times
    </button>
  );
}`;

export const generativeUiBlockConfig = {
  type: "generativeUi" as const,
  propSchema: {
    code: { default: DEFAULT_CODE },
    height: { default: DEFAULT_HEIGHT },
    width: { default: 0 },
  },
  content: "none" as const,
};


function highlightTsx(code: string): string {
  if (!code) return "";
  try {
    return hljs.highlight(code, { language: "tsx", ignoreIllegals: true }).value;
  } catch {
    return code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}

/**
 * Generative UI block — live-renders a self-contained React + TypeScript
 * component pasted from the Components studio (or hand-written). Powered
 * by react-live's in-browser sucrase pipeline; runs inside the page (no
 * iframe sandbox, so don't paste untrusted code).
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
    const code = (block.props.code as string) ?? DEFAULT_CODE;
    const persistedHeight = (block.props.height as number) ?? DEFAULT_HEIGHT;
    const persistedWidth = (block.props.width as number) ?? 0;

    const [view, setView] = useState<"preview" | "source">("preview");
    const [copied, setCopied] = useState(false);
    const [liveSize, setLiveSize] = useState<{ width: number; height: number } | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const currentHeight = liveSize?.height ?? persistedHeight;
    const currentWidth = liveSize?.width ?? persistedWidth;

    const liveCode = useMemo(() => normalizeForLive(code), [code]);
    const highlighted = useMemo(() => highlightTsx(code), [code]);

    const scope = useMemo(
      () => ({
        React,
        useState: React.useState,
        useEffect: React.useEffect,
        useRef: React.useRef,
        useMemo: React.useMemo,
        useCallback: React.useCallback,
        useReducer: React.useReducer,
        useTransition: React.useTransition,
        useDeferredValue: React.useDeferredValue,
      }),
      [],
    );

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
      <LiveProvider code={liveCode} scope={scope} noInline language="tsx">
        <div
          className="bg-card group relative w-full max-w-full overflow-hidden rounded-xl border"
          style={widthStyle}
        >
          <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
            <div className="text-foreground flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              Component
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
          </header>
          <div
            className="bg-muted/30 relative overflow-hidden"
            style={{ height: currentHeight }}
          >
            {view === "preview" ? (
              <div className="h-full overflow-auto p-4">
                <LivePreview />
                <LiveError className="text-destructive mt-3 whitespace-pre-wrap font-mono text-xs" />
              </div>
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
          {view === "source" ? (
            // tiny preview-of-highlighted underlay isn't worth it for now;
            // the textarea is monochrome but readable. Highlighted preview
            // shows in the CodeBlock if the user wants a static read view.
            <div style={{ display: "none" }} dangerouslySetInnerHTML={{ __html: highlighted }} />
          ) : null}
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
        </div>
      </LiveProvider>
    );
  },
});
