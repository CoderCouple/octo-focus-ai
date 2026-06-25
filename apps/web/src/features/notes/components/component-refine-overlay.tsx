"use client";

import {
  Check,
  Copy,
  Loader2,
  Send,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  IframeArtifact,
  streamGeneratedComponent,
  updateSavedComponentClientApi,
} from "@/features/components";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Message {
  role: "user" | "assistant";
  text: string;
  codeUpdate?: boolean;
}

interface ComponentRefineOverlayProps {
  /** Current code shown in the preview + sent to Claude as `currentCode`. */
  code: string;
  /** Optional saved-component id; when set, refines also PATCH the saved row. */
  componentId?: string;
  /** Called with the new code on every successful generation. */
  onApply: (nextCode: string) => void;
  /** Closes the overlay. */
  onClose: () => void;
}

/**
 * Fullscreen edit UI for the generativeUi block. Layout mirrors what
 * the user asked for: preview in the centre/left, AI chat on the right.
 * Claude refines the component via `streamGeneratedComponent` with the
 * current code as context, every "done" frame replaces the preview +
 * propagates back to the block (and to the saved row, when linked).
 */
export function ComponentRefineOverlay({
  code,
  componentId,
  onApply,
  onClose,
}: ComponentRefineOverlayProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState("");
  const [currentCode, setCurrentCode] = useState(code);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length, streamBuffer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !streaming) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, streaming]);

  const handleSend = async () => {
    const prompt = draft.trim();
    if (!prompt || streaming) return;
    setDraft("");
    setMessages((m) => [...m, { role: "user", text: prompt }]);
    setStreamBuffer("");
    setStreaming(true);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      await streamGeneratedComponent(
        { prompt, currentCode },
        {
          onChunk: (delta) => setStreamBuffer((b) => b + delta),
          onDone: async (nextCode) => {
            setStreamBuffer("");
            setCurrentCode(nextCode);
            onApply(nextCode);
            setMessages((m) => [
              ...m,
              {
                role: "assistant",
                text: "Updated. Preview refreshed on the left.",
                codeUpdate: true,
              },
            ]);
            setStreaming(false);
            // If this block references a saved component, persist the
            // change so /c/<id> + every other note embedding the same
            // component picks it up automatically.
            if (componentId) {
              try {
                const language = detectLanguage(nextCode);
                await updateSavedComponentClientApi(componentId, {
                  code: nextCode,
                  language,
                });
              } catch (err) {
                toast.error(
                  err instanceof Error
                    ? `Saved component not updated: ${err.message}`
                    : "Saved component update failed",
                );
              }
            }
          },
          onError: (message) => {
            setMessages((m) => [
              ...m,
              { role: "assistant", text: `Error: ${message}` },
            ]);
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="bg-background/85 fixed inset-0 z-50 grid place-items-center p-4 backdrop-blur-sm"
      onClick={() => !streaming && onClose()}
    >
      <div
        className="bg-card flex h-[90vh] max-h-[1000px] w-full max-w-[1500px] flex-col overflow-hidden rounded-xl border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="text-foreground flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4" />
            Refine component
            {componentId ? (
              <span className="text-muted-foreground font-mono text-xs font-normal">
                {componentId}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="size-7" onClick={handleCopy}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="size-4" />
            </Button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <div className="bg-muted/20 relative flex-1 overflow-hidden">
            <IframeArtifact code={currentCode} className="h-full" />
            {streaming ? (
              <div className="bg-foreground/80 text-background absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs">
                <Loader2 className="size-3 animate-spin" />
                Generating new version…
              </div>
            ) : null}
          </div>

          <aside className="bg-card flex w-[380px] shrink-0 flex-col border-l">
            <div className="text-muted-foreground border-b px-4 py-2 text-xs font-medium uppercase tracking-wider">
              AI assistant
            </div>
            <div
              ref={listRef}
              className="flex-1 space-y-3 overflow-auto p-4"
              aria-live="polite"
            >
              {messages.length === 0 && !streaming ? (
                <div className="text-muted-foreground grid h-full place-items-center text-center text-xs">
                  <div className="space-y-2">
                    <Sparkles className="text-muted-foreground/50 mx-auto size-6" />
                    <p>
                      Describe a change. The preview updates the moment
                      Claude finishes streaming.
                    </p>
                  </div>
                </div>
              ) : null}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "user"
                      ? "bg-foreground text-background ml-auto max-w-[90%] rounded-lg px-3 py-2 text-sm"
                      : "border-border bg-background max-w-[95%] rounded-lg border px-3 py-2 text-sm"
                  }
                >
                  {m.text}
                </div>
              ))}
              {streaming ? (
                <div className="text-muted-foreground inline-flex items-center gap-2 text-xs">
                  <Loader2 className="size-3 animate-spin" />
                  {streamBuffer.length > 0
                    ? `${streamBuffer.length} chars…`
                    : "Thinking…"}
                </div>
              ) : null}
            </div>

            <div className="border-t p-3">
              <div className="flex items-end gap-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder="What should change?"
                  className="min-h-[44px] resize-none text-sm"
                  rows={2}
                  disabled={streaming}
                />
                {streaming ? (
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={handleStop}
                    className="size-9 shrink-0"
                  >
                    <Square className="size-4" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!draft.trim()}
                    className="size-9 shrink-0"
                  >
                    <Send className="size-4" />
                  </Button>
                )}
              </div>
              <p className="text-muted-foreground mt-2 text-[10px]">
                Enter to send, Shift+Enter for newline, Esc closes.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function detectLanguage(code: string): "html" | "tsx" {
  const head = code
    .replace(/^﻿/, "")
    .trimStart()
    .slice(0, 500);
  return /^(<!doctype\s+html|<html[\s>])/i.test(head) ? "html" : "tsx";
}
