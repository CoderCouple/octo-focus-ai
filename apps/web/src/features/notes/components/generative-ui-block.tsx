"use client";

import { createReactBlockSpec } from "@blocknote/react";
import {
  Check,
  Code2,
  Copy,
  Eye,
  GripHorizontal,
  GripVertical,
  Loader2,
  Send,
  Sparkles,
  Square,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as React from "react";
import {
  IframeArtifact,
  streamGeneratedComponent,
  updateSavedComponentClientApi,
} from "@/features/components";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const MIN_HEIGHT = 200;
const MAX_HEIGHT = 1400;
const DEFAULT_HEIGHT = 420;
const MIN_WIDTH = 480;
const MAX_WIDTH = 1600;
const DEFAULT_WIDTH = 880;
const CHAT_WIDTH = 320;

type ResizeDirection = "horizontal" | "vertical" | "both";

const DEFAULT_CODE = `<!DOCTYPE html>
<html>
<head><title>Counter</title>
<style>
  body { margin:0; display:grid; place-items:center; min-height:100vh; background:linear-gradient(135deg,#0f172a,#1e293b); font-family:-apple-system, BlinkMacSystemFont, sans-serif; color:white; }
  button { background:#6366f1; color:white; border:0; padding:14px 28px; border-radius:9999px; font-size:18px; font-weight:600; cursor:pointer; box-shadow:0 8px 24px rgba(99,102,241,0.4); }
  button:hover { background:#818cf8; }
</style>
</head><body>
<button id="b">Clicked 0 times</button>
<script>
  let n=0; const b=document.getElementById('b');
  b.onclick = () => { n++; b.textContent = 'Clicked '+n+' times'; };
</script>
</body></html>`;

export const generativeUiBlockConfig = {
  type: "generativeUi" as const,
  propSchema: {
    componentId: { default: "" },
    code: { default: DEFAULT_CODE },
    height: { default: DEFAULT_HEIGHT },
    width: { default: DEFAULT_WIDTH },
  },
  content: "none" as const,
};

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

function detectLanguage(code: string): "html" | "tsx" {
  const head = code
    .replace(/^﻿/, "")
    .trimStart()
    .slice(0, 500);
  return /^(<!doctype\s+html|<html[\s>])/i.test(head) ? "html" : "tsx";
}

/**
 * Generative UI block — embeds a live HTML artifact in a note. When
 * editable, the block is a 2-pane mini-studio: preview on the left,
 * persistent AI chat sidebar on the right so the user can keep
 * refining the component by chatting (no separate "Refine" button or
 * modal). When non-editable (published note / share link without
 * edit), only the preview renders — readers see no chat or controls.
 *
 * Refining via chat:
 *   - Each user message hits `streamGeneratedComponent` with the
 *     current code as `currentCode`.
 *   - The "done" frame swaps the preview in place and updates the
 *     block's snapshot.
 *   - When the block carries a `componentId`, every successful
 *     refine also PATCHes `/v1/saved-components/:id` so the change
 *     propagates to every other note embedding the same component
 *     and to the public `/c/<id>` URL.
 */
export const GenerativeUiBlock = createReactBlockSpec(generativeUiBlockConfig, {
  toExternalHTML: ({ block }) => (
    <pre>
      <code className="language-html">{block.props.code as string}</code>
    </pre>
  ),
  render: ({ block, editor }) => {
    const snapshotCode = (block.props.code as string) ?? DEFAULT_CODE;
    const componentId = (block.props.componentId as string) || "";
    const persistedHeight = (block.props.height as number) ?? DEFAULT_HEIGHT;
    const persistedWidth = (block.props.width as number) ?? DEFAULT_WIDTH;
    const isEditable = editor.isEditable;

    const [view, setView] = useState<"preview" | "source">("preview");
    const [copied, setCopied] = useState(false);
    const [liveSize, setLiveSize] = useState<{ width: number; height: number } | null>(null);
    const [fetched, setFetched] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState("");
    const [streaming, setStreaming] = useState(false);
    const [streamBuffer, setStreamBuffer] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Resolve which code to render. Reference (componentId) wins when
    // available; otherwise we fall back to the inline snapshot.
    const code = fetched ?? snapshotCode;

    useEffect(() => {
      return () => abortRef.current?.abort();
    }, []);

    useEffect(() => {
      if (!componentId) return;
      let cancelled = false;
      void (async () => {
        try {
          const { getPublicComponentClientApi } = await import("@/features/components");
          const result = await getPublicComponentClientApi(componentId);
          if (cancelled) return;
          if (result?.code) {
            setFetched(result.code);
            if (isEditable && result.code !== snapshotCode) {
              editor.updateBlock(block, { props: { code: result.code } });
            }
          }
        } catch {
          // Snapshot fallback already in effect.
        }
      })();
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [componentId]);

    useEffect(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    }, [messages.length, streaming]);

    useEffect(() => {
      return () => {
        if (copyTimer.current) clearTimeout(copyTimer.current);
      };
    }, []);

    useEffect(() => {
      if (view === "source") textareaRef.current?.focus();
    }, [view]);

    const currentHeight = liveSize?.height ?? persistedHeight;
    const currentWidth = liveSize?.width ?? persistedWidth;

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

    const handleSend = async () => {
      const prompt = draft.trim();
      if (!prompt || streaming) return;
      setDraft("");
      setMessages((m) => [...m, { role: "user", text: prompt }]);
      setStreamBuffer("");
      setStreaming(true);
      setView("preview");
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        await streamGeneratedComponent(
          { prompt, currentCode: code },
          {
            onChunk: (delta) => setStreamBuffer((b) => b + delta),
            onDone: async (nextCode) => {
              setFetched(nextCode);
              setStreamBuffer("");
              setStreaming(false);
              setMessages((m) => [
                ...m,
                { role: "assistant", text: "Updated. Preview refreshed." },
              ]);
              editor.updateBlock(block, { props: { code: nextCode } });
              if (componentId) {
                try {
                  await updateSavedComponentClientApi(componentId, {
                    code: nextCode,
                    language: detectLanguage(nextCode),
                  });
                } catch {
                  // Block snapshot is still up to date; saved row stays stale.
                }
              }
            },
            onError: (message) => {
              setMessages((m) => [...m, { role: "assistant", text: `Error: ${message}` }]);
              setStreaming(false);
            },
          },
          ctrl.signal,
        );
      } catch (err) {
        if ((err as { name?: string })?.name !== "AbortError") {
          setMessages((m) => [
            ...m,
            {
              role: "assistant",
              text: err instanceof Error ? `Error: ${err.message}` : "Generation failed",
            },
          ]);
        }
        setStreaming(false);
      }
    };

    const handleStop = () => {
      abortRef.current?.abort();
      setStreaming(false);
    };

    function startResize(direction: ResizeDirection, event: React.MouseEvent) {
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startY = event.clientY;
      const startW = currentWidth > 0 ? currentWidth : DEFAULT_WIDTH;
      const startH = currentHeight;
      let finalW = startW;
      let finalH = startH;

      const onMove = (ev: MouseEvent) => {
        if (direction !== "vertical") {
          finalW = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startW + (ev.clientX - startX)));
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
      width: currentWidth,
    };

    // Non-editable view — readers see only the rendered artifact, no
    // chat, no resize handles, no source toggle.
    if (!isEditable) {
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
          </header>
          <div className="bg-muted/30 overflow-hidden" style={{ height: currentHeight }}>
            <IframeArtifact code={code} className="h-full" />
          </div>
        </div>
      );
    }

    return (
      <div
        className="bg-card group relative w-full max-w-full overflow-hidden rounded-xl border"
        style={widthStyle}
      >
        <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <div className="text-foreground flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Component
            {componentId ? (
              <span className="text-muted-foreground font-mono text-[10px] font-normal">
                {componentId}
              </span>
            ) : null}
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

        <div className="flex overflow-hidden" style={{ height: currentHeight }}>
          {/* Preview / source — flex-1 fills the rest */}
          <div className="bg-muted/30 relative flex-1 overflow-hidden">
            {view === "preview" ? (
              <IframeArtifact code={code} className="h-full" />
            ) : (
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) =>
                  editor.updateBlock(block, { props: { code: e.target.value } })
                }
                spellCheck={false}
                placeholder="Paste HTML or TSX here…"
                className="h-full w-full resize-none rounded-none border-0 bg-transparent p-3 font-mono text-[0.8rem] leading-relaxed focus:outline-none"
              />
            )}
            {streaming ? (
              <div className="bg-foreground/85 text-background absolute bottom-2 left-2 inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] shadow">
                <Loader2 className="size-3 animate-spin" />
                {streamBuffer.length > 0 ? `${streamBuffer.length} chars` : "Thinking…"}
              </div>
            ) : null}
          </div>

          {/* Chat sidebar — always visible for editable blocks */}
          <aside
            className="bg-card flex shrink-0 flex-col border-l"
            style={{ width: CHAT_WIDTH }}
          >
            <div className="text-muted-foreground border-b px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider">
              AI assistant
            </div>
            <div
              ref={listRef}
              className="flex-1 space-y-2 overflow-auto p-3"
              aria-live="polite"
            >
              {messages.length === 0 && !streaming ? (
                <div className="text-muted-foreground text-[11px] leading-relaxed">
                  <p>Chat to refine. Try:</p>
                  <ul className="mt-1.5 space-y-1 italic">
                    <li>&ldquo;Make the background darker&rdquo;</li>
                    <li>&ldquo;Add a reset button&rdquo;</li>
                    <li>&ldquo;Use orange instead of indigo&rdquo;</li>
                  </ul>
                </div>
              ) : null}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "user"
                      ? "bg-foreground text-background ml-auto max-w-[92%] rounded-lg px-2.5 py-1.5 text-[12px]"
                      : "border-border bg-background max-w-[95%] rounded-lg border px-2.5 py-1.5 text-[12px]"
                  }
                >
                  {m.text}
                </div>
              ))}
              {streaming ? (
                <div className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px]">
                  <Loader2 className="size-3 animate-spin" />
                  thinking…
                </div>
              ) : null}
            </div>
            <div className="border-t p-2">
              <div className="flex items-end gap-1.5">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder="Refine via chat…"
                  className="min-h-[36px] resize-none text-[12px]"
                  rows={2}
                  disabled={streaming}
                />
                {streaming ? (
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={handleStop}
                    className="size-8 shrink-0"
                  >
                    <Square className="size-3.5" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!draft.trim()}
                    className="size-8 shrink-0"
                  >
                    <Send className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </aside>
        </div>

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
    );
  },
});
